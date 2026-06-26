import { URLSearchParams } from 'node:url';

// Parse command line arguments
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.split('=');
    args[key.slice(2)] = value || true;
  }
});

// Helper for parsing comma-separated lists
const parseList = (str) => {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
};

// Required variables check
const requiredEnv = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REFRESH_TOKEN',
  'GOOGLE_DEVELOPER_TOKEN',
  'GOOGLE_CUSTOMER_ID'
];

const missingEnv = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('❌ Error: Missing required environment variables in .env:');
  missingEnv.forEach(k => console.error(`   - ${k}`));
  console.log('\nPlease configure them or run the script passing --env-file=.env option.');
  process.exit(1);
}

// Extract config
const customerId = process.env.GOOGLE_CUSTOMER_ID.replace(/-/g, '');
const devToken = process.env.GOOGLE_DEVELOPER_TOKEN;

// Campaign Options with Defaults
const campaignName = args.name || `[STARKEN][PESQUISA][MADRUGAO][${new Date().toLocaleDateString('pt-BR')}]`;
const dailyBudgetBRL = parseFloat(args.budget) || 20.0; // default R$ 20.00/day
const radiusKm = parseFloat(args.radius) || 5.0; // default 5km radius
const latitude = parseFloat(args.lat) || -26.9189; // default Madrugão coords
const longitude = parseFloat(args.lon) || -49.066;
const keywords = parseList(args.keywords || 'madrugao delivery, madrugao lanches, hamburguer perto de mim, delivery de madrugada');
const finalUrl = args.url || 'https://madrugao.com.br';

async function main() {
  console.log('⚡ Initializing Google Ads Campaign Creation script...');
  console.log(`Campaign Name: "${campaignName}"`);
  console.log(`Daily Budget: R$ ${dailyBudgetBRL}`);
  console.log(`Targeting Area: Proximity of ${radiusKm}km around (${latitude}, ${longitude})`);
  console.log(`Keywords: ${keywords.join(', ')}`);
  console.log(`Final URL: ${finalUrl}\n`);

  // 1. Get Access Token
  console.log('🔄 Requesting OAuth2 Access Token...');
  let accessToken;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`Failed to refresh token: ${JSON.stringify(tokenData)}`);
    }
    accessToken = tokenData.access_token;
    console.log('✅ Access Token generated successfully.');
  } catch (error) {
    console.error('❌ OAuth2 Error:', error.message);
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': devToken,
    'Content-Type': 'application/json',
  };

  // Helper request function
  async function googleAdsRequest(endpoint, body) {
    const url = `https://googleads.googleapis.com/v17/customers/${customerId}/${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(`${endpoint} failed: ${JSON.stringify(data.error)}`);
    }
    return data;
  }

  try {
    // 2. Create Budget (amountMicros: 1 BRL = 1,000,000 micros)
    console.log('💵 Creating Campaign Budget...');
    const budgetAmountMicros = Math.round(dailyBudgetBRL * 1000000);
    const budgetRes = await googleAdsRequest('campaignBudgets:mutate', {
      operations: [
        {
          create: {
            name: `${campaignName} - Budget`,
            amountMicros: budgetAmountMicros.toString(),
            deliveryMethod: 'STANDARD'
          }
        }
      ]
    });
    const budgetResourceName = budgetRes.results[0].resourceName;
    console.log(`✅ Budget Created: ${budgetResourceName}`);

    // 3. Create Campaign
    console.log('🎯 Creating Search Campaign (PAUSED status)...');
    const campaignRes = await googleAdsRequest('campaigns:mutate', {
      operations: [
        {
          create: {
            name: campaignName,
            status: 'PAUSED',
            advertisingChannelType: 'SEARCH',
            campaignBudget: budgetResourceName,
            targetSpend: {}, // Maximizar Cliques
            geoTargetTypeSetting: {
              positiveGeoTargetType: 'PRESENCE',
              negativeGeoTargetType: 'PRESENCE'
            }
          }
        }
      ]
    });
    const campaignResourceName = campaignRes.results[0].resourceName;
    console.log(`✅ Campaign Created: ${campaignResourceName}`);

    // 4. Create Campaign Criteria (Geography & Schedule)
    console.log('📍 Adding Proximity & Schedule Criteria to Campaign...');
    
    // Convert float to micro degrees (latitude * 1e6)
    const latMicro = Math.round(latitude * 1000000);
    const lonMicro = Math.round(longitude * 1000000);

    // Days list for schedule: 18:00 to 23:45
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const scheduleCriteria = days.map(day => ({
      create: {
        campaign: campaignResourceName,
        adSchedule: {
          dayOfWeek: day,
          startHour: 18,
          startMinute: 'ZERO',
          endHour: 23,
          endMinute: 'FORTY_FIVE'
        }
      }
    }));

    const criteriaOperations = [
      {
        create: {
          campaign: campaignResourceName,
          proximity: {
            geoPoint: {
              latitudeInMicroDegrees: latMicro,
              longitudeInMicroDegrees: lonMicro
            },
            radius: radiusKm,
            radiusUnits: 'KILOMETERS'
          }
        }
      },
      ...scheduleCriteria
    ];

    await googleAdsRequest('campaignCriteria:mutate', {
      operations: criteriaOperations
    });
    console.log('✅ Proximity (5km) and Schedule (Daily 18h-23h45) target criteria added.');

    // 5. Create Ad Group
    console.log('📦 Creating Ad Group...');
    const adGroupRes = await googleAdsRequest('adGroups:mutate', {
      operations: [
        {
          create: {
            name: 'Grupo de Anúncios Principal',
            campaign: campaignResourceName,
            status: 'PAUSED',
            type: 'SEARCH_STANDARD'
          }
        }
      ]
    });
    const adGroupResourceName = adGroupRes.results[0].resourceName;
    console.log(`✅ Ad Group Created: ${adGroupResourceName}`);

    // 6. Create Keywords
    console.log('🔑 Adding Keywords...');
    const keywordOperations = keywords.map(kw => ({
      create: {
        adGroup: adGroupResourceName,
        status: 'ENABLED',
        keyword: {
          text: kw,
          matchType: 'PHRASE' // Phrase Match
        }
      }
    }));
    await googleAdsRequest('adGroupCriteria:mutate', {
      operations: keywordOperations
    });
    console.log(`✅ Added ${keywords.length} keywords.`);

    // 7. Create Responsive Search Ad
    console.log('✍️ Creating Responsive Search Ad...');
    await googleAdsRequest('adGroupAds:mutate', {
      operations: [
        {
          create: {
            adGroup: adGroupResourceName,
            status: 'PAUSED',
            ad: {
              responsiveSearchAd: {
                headlines: [
                  { text: 'Madrugão Lanches Delivery' },
                  { text: 'Hambúrguer de Madrugada' },
                  { text: 'Peça Online e Rápido' },
                  { text: 'O Melhor Lanche do Bairro' },
                  { text: 'Matar a Fome na Madrugada' }
                ].slice(0, 15), // Ads supports up to 15 headlines
                descriptions: [
                  { text: 'Bateu aquela fome na madrugada? Os melhores lanches e hambúrgueres entregues rápido.' },
                  { text: 'Confira nosso cardápio completo e peça online com toda comodidade.' },
                  { text: 'Opções incríveis de hambúrgueres e porções artesanais feitas na hora.' }
                ].slice(0, 4), // Ads supports up to 4 descriptions
                path1: 'delivery',
                path2: 'lanches'
              },
              finalUrls: [finalUrl]
            }
          }
        }
      ]
    });
    console.log('✅ Responsive Search Ad created.');
    console.log('\n🎉 ALL OPERATIONS SUCCESSFUL! Google Ads Campaign setup completed.');
    console.log(`Check it out on: https://ads.google.com/aw/campaigns?campaignId=${campaignResourceName.split('/').pop()}`);

  } catch (error) {
    console.error('❌ API Error:', error.message);
    process.exit(1);
  }
}

main();

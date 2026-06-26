# Madrugão Garcia — Públicos Salvos

> Catálogo de públicos salvos disponíveis na conta `910709251642787` com parâmetros reconstruídos para uso direto via API.

---

## Madrugão Garcia #1

| Campo | Valor |
|---|---|
| **Nome (Gerenciador)** | Madrugão Garcia #1 |
| **Status** | Pronto |
| **Tamanho estimado** | 72.000 – 84.700 |
| **Tipo** | Público salvo |
| **Data de criação** | 11/02/2026 20:32 |
| **Última atualização** | 11/02/2026 20:32 |
| **Saved Audience ID** | _bloqueado por rollout MCP — não obtido_ |

### Controles (hard caps)

- **Localização (inclusão):**
  - Brasil, lat `-26.95`, lon `-49.07`, Blumenau/SC, raio **+5 km**
- **Localização (exclusão):**
  - Brasil, lat `-26.91`, lon `-49.07`, Blumenau, raio +2 km
  - Brasil, lat `-26.92`, lon `-49.10`, Blumenau, raio +2 km
  - Brasil, lat `-26.94`, lon `-49.12`, Blumenau, raio +2 km
- **Idade mínima:** 18

### Sugestões (soft, via Advantage+)

- **Idade sugerida:** 18 a 55

### JSON equivalente para uso direto em `targeting` (API/MCP)

```json
{
  "geo_locations": {
    "custom_locations": [
      {"latitude": -26.95, "longitude": -49.07, "radius": 5, "distance_unit": "kilometer", "country": "BR"}
    ]
  },
  "excluded_geo_locations": {
    "custom_locations": [
      {"latitude": -26.91, "longitude": -49.07, "radius": 2, "distance_unit": "kilometer", "country": "BR"},
      {"latitude": -26.92, "longitude": -49.10, "radius": 2, "distance_unit": "kilometer", "country": "BR"},
      {"latitude": -26.94, "longitude": -49.12, "radius": 2, "distance_unit": "kilometer", "country": "BR"}
    ]
  },
  "age_min": 18,
  "targeting_automation": {"advantage_audience": 1}
}
```

> ⚠️ **Restrição da API:** Quando `targeting_automation.advantage_audience: 1`, `age_max` deve ser ≥65 OU omitido. Não usar `age_max: 55` direto — vai retornar erro 1870189 ("Maximum age is too low for Advantage+ Audience"). O upper bound 55 do público salvo é tratado como **sugestão**, não cap hard.

### Usado em

- [[Campanhas/2026-05-28 Hamburger Day/00 - Briefing]]

---

*Última atualização: 2026-05-28*

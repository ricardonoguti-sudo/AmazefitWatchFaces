# Referências técnicas — Amazfit Active 2 Square

Este documento reúne as referências oficiais usadas como base para criar e validar watchfaces deste projeto. Os valores do produto podem mudar com revisões de firmware, ferramentas ou documentação; confirme o suporte atual no Watchface Maker antes de exportar.

## Perfil do dispositivo

Conforme a [lista oficial de dispositivos do Zepp OS](https://docs.zepp.com/docs/reference/related-resources/device-list/):

| Propriedade | Valor |
| --- | --- |
| Nome no Zepp OS | Amazfit Active 2 (Square) |
| API level mais recente listado | 4.2 |
| Versão Zepp OS mais recente listada | 5.0 |
| `deviceSource` | `10223872*`, `10223873`, `10223875` |
| Formato da tela | Square |
| Raio da tela | 86 |
| Resolução | 390 × 450 px |
| Teclas físicas | 2 |
| Preview específico do dispositivo | 266 × 307 px |
| SecondaryWidget | Sim |

O `deviceSource` deve ser conferido na documentação antes de configurar `targets` em um projeto Zepp OS. No runtime, `hmSetting.getDeviceInfo()` pode informar `width`, `height`, `screenShape`, `deviceName`, `keyNumber` e `deviceSource`.

## Especificações físicas relevantes

A [página oficial do produto](https://br.amazfit.com/products/active-2-square) informa:

- Tela AMOLED de 1,75", resolução 390 × 450 e 341 PPI.
- Vidro de safira na tela sensível ao toque.
- Dimensões de 43,32 × 36,9 × 9 mm e peso de 31,4 g sem a pulseira.
- Largura de pulseira de 20 mm e dois botões físicos.
- Bluetooth 5.2 com BLE.
- Bateria nominal de 260 mAh; carregamento magnético estimado em aproximadamente 2 horas.
- Resistência à água de 5 ATM, conforme ISO 22810:2010.

Esses dados orientam o enquadramento, a densidade visual e os testes de leitura, mas não substituem as regras de composição do Zepp OS.

## Regras para watchfaces

Use a [especificação oficial de watchfaces do Zepp OS](https://docs.zepp.com/docs/watchface/specification/) e as [diretrizes oficiais de design](https://docs.zepp.com/docs/designs/customization/watchface/) como fonte principal:

- Reserve uma margem segura de 2 px nas bordas; as áreas superior e inferior podem ser usadas pelo sistema para indicadores.
- A hora é obrigatória em toda watchface.
- Planeje limites de dados: passos até 5 dígitos, distância até 4, calorias até 4, frequência cardíaca até 3 e bateria até 4 dígitos.
- Use fonte mínima de 22 px e espessura de linha mínima de 1 px nas diretrizes de design.
- Para AOD/Always-On Display, mantenha os pixels acesos abaixo de 10% da tela, use fundo preto `#000000`, ponteiro principal branco `#FFFFFF`, não use ponteiro de segundos e minimize deslocamentos entre os modos.
- Suporte os idiomas inglês, chinês tradicional e chinês simplificado quando a watchface for distribuída; use inglês como fallback.
- A imagem de preview deve usar o horário `10:09` conforme a diretriz de design.

## Implementação Zepp OS

Referências oficiais para implementação:

- [Configuração de watchface (`app.json`)](https://docs.zepp.com/docs/v2/watchface/app-json/) — `targets`, `deviceSource`, `designWidth`, assets e idiomas.
- [Adaptação de tela](https://docs.zepp.com/docs/guides/framework/device/screen-adaption/) — benchmark quadrado 390 × 450 px, tipos de tela e uso de `px`.
- [`hmSetting.getDeviceInfo()`](https://docs.zepp.com/docs/watchface/api/hmSetting/getDeviceInfo/) — identificação da tela e do dispositivo em runtime.
- [`hmUI.createWidget()`](https://docs.zepp.com/docs/watchface/api/hmUI/createWidget/) — widgets e níveis de exibição normal, AOD e edição.
- [Modo Always-On Display](https://docs.zepp.com/docs/designs/customization/screen-off-mode/) — composição e restrições visuais do modo de tela apagada.
- [Manual oficial do Amazfit Active 2 (Square)](https://support.amazfit.com/us/amazfit_active_2%28square%29/user-guide) — operação e limitações do dispositivo.

## Nota sobre previews

A lista específica do dispositivo informa `266 × 307 px`, mas a tabela genérica da especificação de watchfaces associa a resolução `390 × 450` ao tamanho `266 × 306 px`. Trate `266 × 307 px` como referência inicial do Active 2 Square e valide a dimensão final no Watchface Maker/exportador antes de distribuir.

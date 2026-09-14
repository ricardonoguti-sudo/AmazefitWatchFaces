# Contexto para o Codex

## O que é este projeto

`AmazfitWatchFaces` é uma coleção de watchfaces personalizadas para o **Amazfit Active 2 Square**. O projeto está em fase inicial de planejamento e criação. Não confundir com um app Android, miniapp Zepp OS ou projeto de controle de câmera.

Leia o [`README.md`](README.md) antes de iniciar uma tarefa e mantenha as mudanças focadas em mostradores para esse modelo de relógio.

As referências técnicas detalhadas estão em [`docs/REFERENCIAS_TECNICAS.md`](docs/REFERENCIAS_TECNICAS.md). Consulte esse arquivo antes de decidir resolução, `deviceSource`, área segura, AOD ou formato de preview.

## Organização esperada

Cada watchface deve ficar isolada em uma pasta própria dentro de `watchfaces/`:

```text
watchfaces/
└── nome-da-watchface/
    ├── README.md   # descrição e instruções específicas
    ├── assets/     # imagens, ícones e fontes
    ├── src/        # arquivos-fonte
    └── build/      # artefatos gerados para instalação
```

Ao criar uma watchface, documente seu propósito, informações exibidas, requisitos de instalação e limitações no README da própria pasta.

## Diretrizes de design

- Priorize legibilidade no uso diário e contraste suficiente entre texto, ícones e fundo.
- Evite excesso de informações na tela principal.
- Mantenha alinhamento, espaçamento e estilo visual consistentes entre as watchfaces.
- Considere ambientes claros e escuros ao validar a leitura.
- Confirme resolução, formatos de arquivo e limitações do Amazfit Active 2 Square antes de exportar.
- Informações possíveis incluem hora, data, bateria, passos, frequência cardíaca, distância, calorias, clima e alarmes; não presuma que toda watchface exibirá todos esses dados.

## Parâmetros técnicos de referência

- Dispositivo Zepp OS: `Amazfit Active 2 (Square)`.
- Tela: quadrada, 390 × 450 px, raio 86; o dispositivo tem duas teclas físicas.
- Identificadores listados pelo Zepp OS: `deviceSource` `10223872*`, `10223873` e `10223875`; API level 4.2 e Zepp OS 5.0 na documentação consultada.
- Preview específico do dispositivo: 266 × 307 px. A especificação genérica também lista 266 × 306 px para 390 × 450; validar no Watchface Maker.
- O produto possui tela AMOLED de 1,75", 341 PPI, vidro de safira e Bluetooth 5.2/BLE.

## Cuidados ao trabalhar no repositório

- Não introduza código, dependências ou documentação de outros projetos sem relação com watchfaces.
- Preserve as watchfaces existentes e prefira adicionar uma nova pasta para um novo design.
- Diferencie arquivos-fonte de artefatos gerados; não declare uma watchface pronta para instalação sem validar o formato final.
- O README principal ainda indica que a licença será definida posteriormente; não invente uma licença sem solicitação explícita.
- Antes de concluir mudanças, execute `git diff --check` e verifique `git status --short`.

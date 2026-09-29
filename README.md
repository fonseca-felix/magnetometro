# Bússola do Capitão

Aplicativo móvel de bússola digital desenvolvido com Expo SDK 57 e React Native. Ele usa o magnetômetro do aparelho para calcular e exibir o azimute e a direção cardeal em tempo real, com uma interface temática inspirada em instrumentos náuticos.

**Apresentação online:** [bussola-expo.vercel.app](https://bussola-expo.vercel.app/)

<p align="center">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.86-20232A?logo=react&logoColor=61DAFB">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white">
  <img alt="Plataformas" src="https://img.shields.io/badge/Android%20%7C%20iOS%20%7C%20Web-multiplataforma-2E7D32">
</p>

## Visão geral

A bússola transforma as leituras dos eixos X, Y e Z do magnetômetro em uma indicação visual de rumo. O mostrador acompanha o norte magnético e apresenta o azimute em graus e as oito direções cardeais e colaterais.

O projeto foi criado como parte de um seminário mobile sobre o sensor magnetômetro.

## Recursos

- Leitura do magnetômetro com `expo-sensors`.
- Cálculo do azimute e identificação das direções N, NE, L, SE, S, SO, O e NO.
- Agulha animada e filtro de suavização para reduzir oscilações visuais.
- Exibição dos valores dos eixos X, Y e Z em microteslas (µT).
- Modo de demonstração quando não há leitura do sensor.
- Janela com instruções para ajudar na calibração física do aparelho, incluindo o movimento em formato de 8.
- Interface responsiva com tema náutico e compatibilidade com Android, iOS e web via Expo.

> **Observação:** leituras reais dependem de um aparelho com magnetômetro. No modo de demonstração, os valores exibidos são ilustrativos. A opção de calibração apresenta instruções; ela não executa uma calibração por software.

## Tecnologias

<p>
  <a href="https://expo.dev/"><img alt="Expo" src="https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white"></a>
  <a href="https://reactnative.dev/"><img alt="React Native" src="https://img.shields.io/badge/React%20Native-20232A?logo=react&logoColor=61DAFB"></a>
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://docs.expo.dev/versions/v57.0.0/sdk/sensors/"><img alt="Expo Sensors" src="https://img.shields.io/badge/Expo%20Sensors-000020?logo=expo&logoColor=white"></a>
  <a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB"></a>
</p>

| Tecnologia | Uso |
| --- | --- |
| Expo SDK 57 | Ferramentas e runtime multiplataforma |
| React Native 0.86 | Interface para dispositivos móveis |
| TypeScript 6 | Tipagem e desenvolvimento |
| `expo-sensors` | Acesso às leituras do magnetômetro |
| `expo-linear-gradient` | Recursos de gradiente disponíveis no projeto |
| `expo-status-bar` | Controle da barra de status |
| `@expo/vector-icons` | Biblioteca de ícones do Expo |

## Pré-requisitos

- Node.js e npm instalados.
- Um dispositivo com magnetômetro para testar a leitura real do sensor.
- Para executar em Android ou iOS, use um dispositivo ou emulador configurado para desenvolvimento Expo.

## Como executar

Clone o repositório e entre na pasta do projeto:

```bash
git clone <URL_DO_REPOSITORIO>
cd magnetometro
```

> Substitua `<URL_DO_REPOSITORIO>` pela URL do repositório Git.

Instale as dependências e inicie o Expo:

```bash
npm install
npx expo start
```

No terminal do Expo, escolha a plataforma desejada ou abra o projeto no aplicativo Expo Go. Para iniciar diretamente:

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

Os scripts correspondentes também estão disponíveis com `npm run android`, `npm run ios` e `npm run web`.

> A disponibilidade e o comportamento do magnetômetro variam conforme o dispositivo e a plataforma. Em ambientes sem sensor compatível, o app permanece no modo de demonstração.

## Como usar

1. Inicie o aplicativo em um aparelho compatível para receber as leituras reais.
2. Mantenha o dispositivo nivelado e afastado de metais e fontes de interferência magnética.
3. Consulte o rumo em graus, a direção indicada e os valores dos eixos do sensor.
4. Se a orientação parecer imprecisa, abra **Calibrar instrumento** e siga a instrução de movimentar o aparelho em formato de 8.

## Estrutura do projeto

```text
.
├── App.tsx       # Tela da bússola, cálculos e leitura do sensor
├── index.ts      # Registro do componente raiz no Expo
├── app.json      # Configuração do aplicativo Expo
├── package.json  # Dependências e scripts
└── assets/       # Ícones e imagens do aplicativo
```

## Autoria

Desenvolvido por:

- [fonseca-felix](https://github.com/fonseca-felix)
- [omaurojunior](https://github.com/omaurojunior)

## Licença

Consulte o arquivo [LICENSE](LICENSE) para ver os termos de uso e distribuição.

## Documentação

- [Documentação do Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo Sensors](https://docs.expo.dev/versions/v57.0.0/sdk/sensors/)
- [React Native](https://reactnative.dev/docs/getting-started)
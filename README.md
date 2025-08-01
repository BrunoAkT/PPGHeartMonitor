# 📱 Projeto PPG com React Native Vision Camera

Este projeto utiliza a câmera traseira e o flash do celular para estimar os batimentos cardíacos (BPM) com base na técnica de **fotopletismografia (PPG)**, através da detecção da variação da luz refletida no dedo do usuário.

---

## 🔧 Tecnologias e Bibliotecas

- **React Native**
- `react-native-vision-camera` (acesso à câmera)
- `react-native-worklets-core` (execução em tempo real)
- Plugin nativo em **Kotlin** para processamento de quadros (Frame Processor Plugin)

---

## 🚀 Como Funciona

O plugin nativo (`PpgtestcameraPlugin`) acessa os frames da câmera no formato **YUV**.

1. Extrai a **média de intensidade do canal vermelho** de uma região central da imagem, representando o sinal PPG bruto.
2. O valor é **normalizado** (AC/DC) para isolar pequenas variações causadas pela pulsação do sangue.
3. Esse valor normalizado é enviado para o JavaScript em tempo real com `Worklets.createRunOnJS`.
4. O app registra os valores ao longo do tempo e aplica:
   - **Média móvel** para suavização
   - **Detecção de picos** para encontrar batimentos
   - **Cálculo de BPM** baseado no intervalo entre picos

---

## 📈 Funcionalidades

- 📊 Gráfico em tempo real do sinal PPG (AC)
- ❤️ Exibição contínua do valor de BPM
- 🔦 Botão para ligar/desligar a lanterna do celular
- 📸 Permissões automáticas de uso da câmera
- 🛡️ Detecção robusta com filtro para valores anômalos e ruído

---

## 🧠 Lógica de Processamento

- **Filtro de ruído**: ignora saltos grandes no sinal
- **Detecção de picos** com base em distância mínima (frames) e proeminência
- **Cálculo do BPM** com base nos timestamps dos picos detectados

---

## 📦 Estrutura do Código

- `PPGCamera.tsx`: componente principal da câmera, gráfico e lógica de BPM  
- `PPGconection.ts`: integração com o plugin nativo  
- `PpgtestcameraPlugin.kt`: plugin nativo Kotlin para processar os quadros da câmera

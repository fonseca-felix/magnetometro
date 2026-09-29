/**
 * BÚSSOLA PIRATA DIGITAL
 * App.tsx completo para Expo (SDK 51+) + TypeScript + React Native
 *
 * Autores: Félix & Mauro
 * Seminário Mobile - Sensor Magnetômetro
 *
 * Funcionalidades:
 * - Leitura do magnetômetro via expo-sensors
 * - Cálculo do azimute (rumo) em tempo real a partir dos eixos X e Y
 * - Mostrador pirata com agulha, rosa-dos-ventos e detalhes náuticos
 * - Indicadores de direção cardeais e colaterais
 * - Simulação com valores fixos se o sensor não estiver disponível
 * - Modal de calibração com instrução do movimento em "8"
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
} from "react-native";
import { Magnetometer, MagnetometerMeasurement } from "expo-sensors";
import { Subscription } from "expo-sensors/build/Pedometer";

// ---------------------------------------------------------------------------
// CONSTANTES E AJUSTES
// ---------------------------------------------------------------------------

// Largura da tela, usada para dimensionar a bússola proporcionalmente
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Tamanho do mostrador da bússola (quadrado, depois vira círculo com borderRadius)
const COMPASS_SIZE = Math.min(SCREEN_WIDTH - 48, 420);

// Intervalo de atualização do magnetômetro em milissegundos (quanto menor, mais suave)
const UPDATE_INTERVAL_MS = 16;

// ---------------------------------------------------------------------------
// FUNÇÃO AUXILIAR: cálculo do azimute a partir de X e Y do magnetômetro
// ---------------------------------------------------------------------------

/**
 * Converte as leituras brutas do magnetômetro em um ângulo de azimute.
 *
 * Fórmula:
 *   theta = atan2(Y, X)
 *   azimute = (theta * 180 / PI + 360) % 360
 *
 * @param x - campo magnético no eixo X (microteslas)
 * @param y - campo magnético no eixo Y (microteslas)
 * @returns ângulo entre 0° e 360° representando o norte magnético
 */
function calculateAzimuth(x: number, y: number): number {
  const angleRadians = Math.atan2(-x, y);
  let angleDegrees = (angleRadians * 180) / Math.PI;
  angleDegrees = (angleDegrees + 360) % 360;
  return angleDegrees;
}

/**
 * Filtro passa-baixas para suavizar a vibração do sensor.
 */
function suavizarAngulo(anterior: number, novo: number, alpha = 0.15): number {
  let delta = novo - anterior;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let resultado = anterior + delta * alpha;
  if (resultado < 0) resultado += 360;
  if (resultado >= 360) resultado -= 360;
  return resultado;
}

/**
 * Converte um azimute numa das oito direções cardeais/colaterais.
 */
function getDirectionName(azimuth: number): string {
  const directions = [
    "N",   // 0°
    "NE",  // 45°
    "L",   // 90°  (Leste)
    "SE",  // 135°
    "S",   // 180°
    "SO",  // 225°
    "O",   // 270° (Oeste)
    "NO",  // 315°
  ];
  const index = Math.round(azimuth / 45) % 8;
  return directions[index];
}

// ---------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ---------------------------------------------------------------------------

export default function PirateCompassScreen() {
  // Armazena a leitura mais recente do magnetômetro
  const [magnetometer, setMagnetometer] = useState<MagnetometerMeasurement>({
    x: 12.4,
    y: -34.1,
    z: 48.0,
    timestamp: 0,
  });

  // Indica se o sensor já foi realmente atualizado pelo hardware
  const [sensorActive, setSensorActive] = useState(false);

  // Azimute suave armazenado no estado para exibição do número
  const [heading, setHeading] = useState(0);

  // Controla a exibição do modal de calibração
  const [calibrationVisible, setCalibrationVisible] = useState(false);

  const anguloRef = useRef(0);
  const anguloContinuoRef = useRef(0);
  const rotacao = useRef(new Animated.Value(0)).current;

  const processarLeitura = useCallback(
    (data: MagnetometerMeasurement) => {
      const bruto = calculateAzimuth(data.x, data.y);
      const suave = suavizarAngulo(anguloRef.current, bruto);

      let delta = suave - anguloRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      anguloContinuoRef.current += delta;
      anguloRef.current = suave;

      Animated.timing(rotacao, {
        toValue: anguloContinuoRef.current,
        duration: 32,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();

      setHeading(suave);
      setMagnetometer(data);
      setSensorActive(true);
    },
    [rotacao]
  );

  // -------------------------------------------------------------------------
  // Efeito: assina o magnetômetro ao montar e cancela ao desmontar
  // -------------------------------------------------------------------------
  useEffect(() => {
    let subscription: Subscription | null = null;

    async function startMagnetometer() {
      try {
        // Configura a velocidade de atualização do sensor
        Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);

        // Inicia a escuta das leituras do magnetômetro
        subscription = Magnetometer.addListener(processarLeitura);
      } catch (error) {
        // Se houver erro (permissão ou hardware inexistente), mantém valores de demo
        Alert.alert(
          "Sensor indisponível",
          "Usando valores de demonstração. Em um aparelho real com magnetômetro, a leitura aparecerá aqui."
        );
      }
    }

    void startMagnetometer();

    // Cleanup: remove a assinatura do sensor para evitar vazamentos de memória
    return () => {
      subscription?.remove();
    };
  }, [processarLeitura]);

  // -------------------------------------------------------------------------
  // Memos: cálculos derivados das leituras brutas
  // -------------------------------------------------------------------------

  // Direção cardeal correspondente
  const direction = useMemo(() => getDirectionName(heading), [heading]);

  const rotacaoAgulha = rotacao.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "-360deg"],
  });

  // -------------------------------------------------------------------------
  // RENDERIZAÇÃO DOS TICKS DO MOSTRADOR
  // -------------------------------------------------------------------------

  /**
   * Gera 72 marcas de graduação ao redor do círculo da bússola.
   * A cada 6 ticks (30°) a marca é maior e mais escura.
   */
  const renderTicks = () => {
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const isMajor = i % 6 === 0;
      ticks.push(
        <View
          key={i}
          style={[
            styles.tick,
            isMajor && styles.tickMajor,
            {
              // Posiciona cada tick rotacionando em torno do centro
              transform: [
                { rotate: `${i * 5}deg` },
                { translateY: -COMPASS_SIZE * 0.42 },
              ],
            },
          ]}
        />
      );
    }
    return ticks;
  };

  // -------------------------------------------------------------------------
  // RENDERIZAÇÃO PRINCIPAL
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ScrollView permite rolar em telas pequenas sem cortar elementos */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* CABEÇALHO PIRATA */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>☠</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Bússola do Capitão</Text>
            <Text style={styles.subtitle}>Seminário Mobile • Félix & Mauro</Text>
          </View>
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: sensorActive ? "#4ade80" : "#f59e0b" },
              ]}
            />
            <Text style={styles.statusText}>
              {sensorActive ? "Redmi Note 12 • Conectado" : "Modo demonstração"}
            </Text>
          </View>
        </View>

        {/* RUMO ATUAL */}
        <View style={styles.headingBox}>
          <Text style={styles.headingLabel}>Rumo atual</Text>
          <Text style={styles.headingValue}>
            {Math.round(heading).toString().padStart(3, "0")}° {direction}
          </Text>
          <Text style={styles.headingCaption}>
            O norte guarda o caminho para águas desconhecidas.
          </Text>
        </View>

        {/* MOSTRADOR DA BÚSSOLA */}
        <View style={[styles.compassShell, { width: COMPASS_SIZE, height: COMPASS_SIZE }]}>
          {/* Borda externa com rebites simulados */}
          <View style={styles.compassRim} />

          {/* Face interna da bússola */}
          <View style={styles.compassFace}>
            {renderTicks()}

            {/* Rosa dos ventos: direções cardeais */}
            <Text style={[styles.cardinal, styles.north]}>N</Text>
            <Text style={[styles.cardinal, styles.south]}>S</Text>
            <Text style={[styles.cardinal, styles.east]}>O</Text>
            <Text style={[styles.cardinal, styles.west]}>L</Text>

            {/* Rosa dos ventos: direções colaterais (Invertidos para a agulha) */}
            <Text style={[styles.ordinal, styles.ne]}>NO</Text>
            <Text style={[styles.ordinal, styles.se]}>SO</Text>
            <Text style={[styles.ordinal, styles.sw]}>SE</Text>
            <Text style={[styles.ordinal, styles.nw]}>NE</Text>

            {/* Agulha: gira no sentido oposto ao azimute para apontar ao norte */}
            <Animated.View
              style={[
                styles.needleContainer,
                { transform: [{ rotate: rotacaoAgulha }] },
              ]}
            >
              <View style={styles.needleNorth} />
              <View style={styles.needleSouth} />
              <View style={styles.needlePin}>
                <Text style={styles.needlePinIcon}>☠</Text>
              </View>
            </Animated.View>

            {/* Flor de lis decorativa no topo */}
            <Text style={styles.fleur}>♠</Text>
          </View>
        </View>

        {/* PAINEL INFORMATIVO */}
        <View style={styles.infoPanel}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>◎</Text>
            <View>
              <Text style={styles.infoLabel}>Azimute</Text>
              <Text style={styles.infoValue}>{heading.toFixed(1)}°</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⚑</Text>
            <View>
              <Text style={styles.infoLabel}>Direção</Text>
              <Text style={styles.infoValue}>{direction} — {{
                "N": "Norte", "NE": "Nordeste", "L": "Leste", "SE": "Sudeste",
                "S": "Sul", "SO": "Sudoeste", "O": "Oeste", "NO": "Noroeste"
              }[direction]}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⚓</Text>
            <View>
              <Text style={styles.infoLabel}>Magnetômetro</Text>
              <Text style={styles.infoMono}>
                X {magnetometer.x.toFixed(1)} · Y {magnetometer.y.toFixed(1)} · Z{" "}
                {magnetometer.z.toFixed(1)} µT
              </Text>
            </View>
          </View>
        </View>

        {/* BOTÕES DE AÇÃO */}
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            // Reativa a leitura caso tenha parado (em alguns aparelhos re-abre a assinatura)
            Magnetometer.setUpdateInterval(UPDATE_INTERVAL_MS);
            setSensorActive(true);
          }}
        >
          <Text style={styles.primaryButtonText}>Ativar bússola</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => setCalibrationVisible(true)}
        >
          <Text style={styles.secondaryButtonText}>Calibrar instrumento</Text>
        </Pressable>



        <Text style={styles.hint}>
          Mantenha o aparelho nivelado e distante de metais pesados para maior precisão.
        </Text>
      </ScrollView>

      {/* MODAL DE CALIBRAÇÃO */}
      <Modal
        animationType="fade"
        transparent
        visible={calibrationVisible}
        onRequestClose={() => setCalibrationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalLabel}>Ajuste de precisão</Text>
                <Text style={styles.modalTitle}>Calibre sua bússola</Text>
              </View>
              <Pressable
                style={styles.modalClose}
                onPress={() => setCalibrationVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.figureEightBox}>
              <Text style={styles.figureEight}>8</Text>
            </View>

            <Text style={styles.modalBody}>
              Segure o aparelho firmemente e desenhe um grande número 8 no ar por alguns
              segundos.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() => setCalibrationVisible(false)}
            >
              <Text style={styles.primaryButtonText}>Entendido, capitão</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ESTILOS
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Papel envelhecido de mapa pirata
    backgroundColor: "#1f1a14",
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Cabeçalho
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(217, 180, 130, 0.35)",
    paddingVertical: 18,
    marginBottom: 24,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(217, 180, 130, 0.6)",
    backgroundColor: "#2e2620",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  badgeIcon: {
    color: "#d4a574",
    fontSize: 22,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#f3e6d3",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "#a89078",
    fontSize: 11,
    textTransform: "uppercase",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 25, 20, 0.7)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(217, 180, 130, 0.25)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: "#a89078",
    fontSize: 10,
    fontWeight: "600",
  },

  // Rumo
  headingBox: {
    alignItems: "center",
    marginBottom: 22,
  },
  headingLabel: {
    color: "#d4a574",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headingValue: {
    color: "#f3e6d3",
    fontSize: 40,
    fontWeight: "800",
    marginTop: 4,
  },
  headingCaption: {
    color: "#9c8770",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  // Bússola
  compassShell: {
    borderRadius: COMPASS_SIZE / 2,
    // Gradiente metálico enferrujado
    backgroundColor: "#4a3c2f",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 35,
    elevation: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  compassRim: {
    ...StyleSheet.absoluteFill,
    borderRadius: COMPASS_SIZE / 2,
    borderWidth: 10,
    borderColor: "#5c4b3c",
  },
  compassFace: {
    width: COMPASS_SIZE * 0.84,
    height: COMPASS_SIZE * 0.84,
    borderRadius: COMPASS_SIZE * 0.42,
    backgroundColor: "#e8dcc8",
    borderWidth: 2,
    borderColor: "#3b2f25",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // Ticks
  tick: {
    position: "absolute",
    width: 1.5,
    height: 10,
    backgroundColor: "#3b2f25",
  },
  tickMajor: {
    width: 2.5,
    height: 18,
    backgroundColor: "#5c3a2e",
  },

  // Rosa dos ventos
  cardinal: {
    position: "absolute",
    color: "#6b3a2e",
    fontWeight: "900",
    fontSize: 30,
  },
  ordinal: {
    position: "absolute",
    color: "#5c4b3c",
    fontWeight: "700",
    fontSize: 14,
  },
  north: { top: "7%" },
  south: { bottom: "7%" },
  east: { right: "9%" },
  west: { left: "9%" },
  ne: { top: "20%", right: "20%" },
  se: { bottom: "20%", right: "20%" },
  sw: { bottom: "20%", left: "20%" },
  nw: { top: "20%", left: "20%" },

  // Agulha
  needleContainer: {
    position: "absolute",
    width: "70%",
    height: "70%",
    alignItems: "center",
    justifyContent: "center",
  },
  needleNorth: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: COMPASS_SIZE * 0.32,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#8b3a2e",
  },
  needleSouth: {
    position: "absolute",
    bottom: 0,
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: COMPASS_SIZE * 0.32,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#3b2f25",
  },
  needlePin: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#c49e76",
    borderWidth: 4,
    borderColor: "#4a3c2f",
    alignItems: "center",
    justifyContent: "center",
  },
  needlePinIcon: {
    color: "#2e2620",
    fontSize: 20,
  },

  // Flor de lis
  fleur: {
    position: "absolute",
    top: "16%",
    color: "#5c4b3c",
    fontSize: 22,
    opacity: 0.45,
  },

  // Painel
  infoPanel: {
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(217, 180, 130, 0.25)",
    paddingVertical: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  infoIcon: {
    color: "#d4a574",
    fontSize: 22,
    width: 34,
    textAlign: "center",
    marginRight: 10,
  },
  infoLabel: {
    color: "#a89078",
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: "#f3e6d3",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 1,
  },
  infoMono: {
    color: "#d4c4b0",
    fontSize: 14,
    fontFamily: "monospace",
    marginTop: 1,
  },

  // Botões
  primaryButton: {
    width: "100%",
    backgroundColor: "#d4a574",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#1f1a14",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(217, 180, 130, 0.55)",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  secondaryButtonText: {
    color: "#d4a574",
    fontSize: 16,
    fontWeight: "600",
  },
  hint: {
    color: "#9c8770",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(12, 10, 8, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#2a231c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(217, 180, 130, 0.25)",
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalLabel: {
    color: "#d4a574",
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  modalTitle: {
    color: "#f3e6d3",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  modalClose: {
    padding: 6,
  },
  modalCloseText: {
    color: "#a89078",
    fontSize: 20,
    fontWeight: "700",
  },
  figureEightBox: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  figureEight: {
    color: "#d4a574",
    fontSize: 110,
    fontWeight: "700",
    transform: [{ rotate: "-12deg" }],
    textShadowColor: "#1f1a14",
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  modalBody: {
    color: "#b8a694",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
});

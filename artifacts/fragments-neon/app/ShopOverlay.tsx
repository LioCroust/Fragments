import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShardSprite from '../components/ShardSprite';

export type ShopItemId = 'SHIELD' | 'PULSE' | 'DRONE';

export type ShopItem = {
  id: ShopItemId;
  title: string;
  eyebrow: string;
  description: string;
  cost: number;
  accent: string;
  available: boolean;
  disabledLabel?: string;
  ownedCount?: number;
};

type ShopOverlayProps = {
  visible: boolean;
  score: number;
  bestScore: number;
  shards: number;
  currentShields: number;
  maxShields: number;
  vendorSource: number;
  aegisSource: number;
  speedBoostSource: number;
  items: ShopItem[];
  notice: string;
  onBuy: (item: ShopItem) => void;
  onOpenShardPurchase: () => void;
  onClose: () => void;
};

type TelemetrySpriteKind = 'SCORE' | 'SHIELD';

const TelemetrySprite = ({
  kind,
  color,
}: {
  kind: TelemetrySpriteKind;
  color: string;
}) => (
  <Svg width={30} height={26} viewBox="0 0 30 26" accessibilityLabel={`${kind} sprite`}>
    {kind === 'SCORE' && (
      <>
        <Polygon points="4,5 9,2 21,2 26,5 26,21 21,24 9,24 4,21" fill="none" stroke={color} strokeWidth="1.4" />
        <Polyline points="9,8 13,6 17,8 13,10 9,8 9,13 13,15 17,13 17,18 13,20 9,18" fill="none" stroke={color} strokeWidth="1.3" />
        <Line x1="19" y1="7" x2="22" y2="7" stroke={color} strokeWidth="1.4" />
        <Line x1="19" y1="11" x2="22" y2="11" stroke={color} strokeWidth="1.4" />
        <Line x1="19" y1="15" x2="22" y2="15" stroke={color} strokeWidth="1.4" />
      </>
    )}
    {kind === 'SHIELD' && (
      <>
        <Polygon points="15,2 25,6 23,16 15,24 7,16 5,6" fill="none" stroke={color} strokeWidth="1.5" />
        <Polygon points="15,6 21,8 19.5,15 15,20 10.5,15 9,8" fill="none" stroke={color} strokeWidth="1.2" />
      </>
    )}
    <Circle cx="15" cy="13" r="1.4" fill={color} />
  </Svg>
);

const ShopOverlay = ({
  visible,
  score,
  bestScore,
  shards,
  currentShields,
  maxShields,
  vendorSource,
  aegisSource,
  speedBoostSource,
  items,
  notice,
  onBuy,
  onOpenShardPurchase,
  onClose,
}: ShopOverlayProps) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.scrim}>
        <View style={[styles.shell, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.scanline} />

          <ScrollView
            style={styles.shopScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.shopTelemetry}>
              <View style={[styles.telemetryCard, { borderColor: 'rgba(255, 243, 214, 0.52)' }]}>
                <TelemetrySprite kind="SCORE" color="#fff3d6" />
                <View>
                  <Text style={styles.telemetryLabel}>SCORE</Text>
                  <Text style={[styles.telemetryValue, { color: '#fff3d6' }]}>{score.toString().padStart(6, '0')}</Text>
                  <Text style={styles.telemetryMeta}>BEST {bestScore.toString().padStart(6, '0')}</Text>
                </View>
              </View>
              <View style={[styles.telemetryCard, { borderColor: 'rgba(0, 243, 255, 0.52)' }]}>
                <TelemetrySprite kind="SHIELD" color="#00f3ff" />
                <View>
                  <Text style={styles.telemetryLabel}>BOUCLIERS</Text>
                  <Text style={[styles.telemetryValue, { color: '#00f3ff' }]}>{currentShields}/{maxShields}</Text>
                  <Text style={styles.telemetryMeta}>COQUE ACTIVE</Text>
                </View>
              </View>
              <Pressable
                onPress={onOpenShardPurchase}
                style={[
                  styles.telemetryCard,
                  styles.shardTelemetryCard,
                  { borderColor: 'rgba(223, 255, 107, 0.8)' },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Acheter des éclats"
                accessibilityHint="Ouvre la réserve d’éclats de Korv-9"
                testID="open-shard-purchase"
              >
                <ShardSprite size={30} frame={2} />
                <View>
                  <Text style={styles.telemetryLabel}>ÉCLATS</Text>
                  <Text style={[styles.telemetryValue, { color: '#dfff6b' }]}>{shards}</Text>
                  <Text style={[styles.telemetryMeta, styles.telemetryMetaAccent]}>TOUCHER • ACHETER</Text>
                </View>
              </Pressable>
            </View>

            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={styles.kicker}>SERVICE DE RÉPARATION / ÉCHANGE</Text>
                <Text style={styles.title}>LE COMPTOIR DES ÉCLATS</Text>
                <Text style={styles.subtitle}>
                  Répare. Renforce. Repars plus loin.
                </Text>
              </View>
            </View>

            <View style={[styles.vendorPanel, compact && styles.vendorPanelCompact]}>
              <View style={styles.vendorGlow} />
              <Image
                source={vendorSource}
                style={[styles.vendorImage, compact && styles.vendorImageCompact]}
                resizeMode="contain"
                accessibilityLabel="Marchand alien réparateur avec ses outils"
              />
              <View style={styles.vendorCopy}>
                <Text style={styles.vendorName}>KORV-9</Text>
                <Text style={styles.vendorRole}>MÉCANICIEN DE COULOIR</Text>
                <Text style={styles.vendorQuote}>
                  « Ton vaisseau fuit. Tes éclats, eux, peuvent encore servir. »
                </Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionKicker}>INVENTAIRE DE KORV-9</Text>
            </View>
            {notice ? <Text style={styles.shopNotice}>{notice}</Text> : null}

            <View style={styles.itemList}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => onBuy(item)}
                  disabled={item.id === 'DRONE'}
                  style={({ pressed }) => [
                    styles.itemCard,
                    { borderColor: `${item.accent}88` },
                    pressed && item.id !== 'DRONE' && styles.itemCardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.id === 'DRONE'
                      ? item.disabledLabel
                      : `${item.available ? 'Acheter' : 'Voir le prix'} ${item.title}`
                  }
                  accessibilityHint={
                    item.id === 'DRONE'
                      ? undefined
                      : 'Toucher n’importe où dans la carte'
                  }
                  testID={`buy-${item.id.toLowerCase()}`}
                >
                  <View style={[styles.itemAccent, { backgroundColor: item.accent }]} />
                  <View style={styles.itemIconFrame}>
                    {item.id === 'SHIELD' && (
                      <Image
                        source={aegisSource}
                        style={styles.shieldShopImage}
                        resizeMode="contain"
                        accessibilityLabel="Sprite de la plaque Aegis"
                      />
                    )}
                    {item.id === 'PULSE' && (
                      <Image
                        source={speedBoostSource}
                        style={styles.speedBoostShopImage}
                        resizeMode="contain"
                        accessibilityLabel="Sprite de surcharge ionique"
                      />
                    )}
                    {item.id === 'DRONE' && (
                      <View style={[styles.lockIcon, { borderColor: item.accent }]}>
                        <View style={[styles.lockTop, { borderColor: item.accent }]} />
                        <View style={[styles.lockSlot, { backgroundColor: item.accent }]} />
                      </View>
                    )}
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={[styles.itemEyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                   <Text style={styles.itemDescription}>{item.description}</Text>
                   {item.ownedCount !== undefined && item.ownedCount > 0 && (
                     <Text style={[styles.itemStock, { color: item.accent }]}>
                       STOCK : {item.ownedCount} CHARGE{item.ownedCount > 1 ? 'S' : ''}
                     </Text>
                   )}
                  </View>
                  <View style={styles.itemAction}>
                    {item.id === 'DRONE' ? (
                      <View style={styles.lockedPill}>
                        <Text style={styles.lockedText}>CADENAS</Text>
                        <Text style={styles.lockedSubtext}>{item.disabledLabel}</Text>
                      </View>
                    ) : (
                      <View style={styles.priceReadout}>
                        <Text style={[styles.priceLabel, { color: item.available ? item.accent : '#677382' }]}>
                          PRIX :
                        </Text>
                        <Text style={[styles.priceValue, { color: item.available ? item.accent : '#677382' }]}>
                          {item.cost} ÉCLATS
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={onOpenShardPurchase}
                style={({ pressed }) => [
                  styles.itemCard,
                  styles.shardCard,
                  pressed && styles.itemCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Acheter des éclats auprès de Korv-9"
                accessibilityHint="Ouvre la réserve et les packs d’éclats"
                testID="open-shard-purchase-apex"
              >
                <View style={[styles.itemAccent, { backgroundColor: '#dfff6b' }]} />
                <View style={styles.itemIconFrame}>
                  <ShardSprite size={42} frame={2} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={[styles.itemEyebrow, { color: '#dfff6b' }]}>RÉSERVE D’ÉCLATS</Text>
                  <Text style={styles.itemTitle}>PACKS D’ÉCLATS</Text>
                  <Text style={styles.itemDescription}>Recharge ta réserve auprès de Korv-9.</Text>
                </View>
                <View style={styles.itemAction}>
                  <Text style={[styles.priceLabel, styles.shardPriceLabel]}>ACHETER</Text>
                </View>
              </Pressable>
            </View>

          </ScrollView>
          <View style={styles.bottomRail}>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Retour à la partie"
              testID="close-shop"
            >
              <Text style={styles.closeButtonText}>RETOUR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ShopOverlay;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(1, 4, 11, 0.9)',
  },
  shell: {
    flex: 1,
    marginHorizontal: 10,
    paddingHorizontal: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.58)',
    backgroundColor: '#070d18',
  },
  scanline: {
    position: 'absolute',
    top: '24%',
    left: -20,
    right: -20,
    height: 1,
    backgroundColor: 'rgba(0, 243, 255, 0.12)',
  },
  shopScroll: {
    flex: 1,
  },
  bottomRail: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 66,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(126, 135, 155, 0.28)',
  },
  closeButton: {
    minWidth: 126,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: '#00f3ff',
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    shadowColor: '#00f3ff',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  closeButtonText: {
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 10,
  },
  shopTelemetry: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  telemetryCard: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderWidth: 1,
    backgroundColor: 'rgba(10, 17, 28, 0.9)',
  },
  shardTelemetryCard: {
    backgroundColor: 'rgba(223, 255, 107, 0.1)',
    shadowColor: '#dfff6b',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  telemetryLabel: {
    color: '#7e879b',
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    letterSpacing: 0.8,
  },
  telemetryValue: {
    marginTop: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 17,
    letterSpacing: 0.6,
  },
  telemetryMeta: {
    marginTop: 1,
    color: '#7e879b',
    fontFamily: 'Inter_700Bold',
    fontSize: 5,
    letterSpacing: 0.55,
  },
  telemetryMetaAccent: {
    color: '#dfff6b',
    letterSpacing: 0.35,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  headingCopy: {
    flex: 1,
  },
  kicker: {
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.35,
  },
  title: {
    marginTop: 4,
    color: '#f3f7ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 25,
    letterSpacing: 1.1,
    textShadowColor: '#00f3ff',
    textShadowRadius: 10,
  },
  subtitle: {
    marginTop: 8,
    color: '#9ca9bb',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  currencyPanel: {
    alignSelf: 'flex-start',
    minWidth: 78,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(223, 255, 107, 0.55)',
    backgroundColor: 'rgba(223, 255, 107, 0.07)',
  },
  currencyLabel: {
    color: '#7e879b',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.1,
  },
  currencyValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  coinMark: {
    width: 11,
    height: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 6,
  },
  coinMarkCore: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  currencyValue: {
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 24,
  },
  currencyMeta: {
    marginTop: 1,
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.2,
  },
  vendorPanel: {
    minHeight: 246,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 202, 0.45)',
    backgroundColor: 'rgba(22, 14, 36, 0.9)',
  },
  vendorPanelCompact: {
    minHeight: 218,
  },
  vendorGlow: {
    position: 'absolute',
    right: -45,
    bottom: -70,
    width: 210,
    height: 210,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
  },
  vendorImage: {
    width: 192,
    height: 248,
    marginLeft: -8,
    marginBottom: -16,
  },
  vendorImageCompact: {
    width: 166,
    height: 220,
    marginLeft: -12,
  },
  vendorCopy: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  vendorName: {
    color: '#ff47ca',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    letterSpacing: 2.2,
  },
  vendorRole: {
    marginTop: 1,
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.1,
  },
  vendorQuote: {
    marginTop: 12,
    color: '#d3d9e4',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    lineHeight: 14,
  },
  vendorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#dfff6b',
  },
  vendorStatusText: {
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.85,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionKicker: {
    color: '#7e879b',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.2,
  },
  sectionTitle: {
    marginTop: 2,
    color: '#f3f7ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  shieldReadout: {
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.65,
  },
  shopNotice: {
    marginBottom: 8,
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.7,
  },
  itemList: {
    gap: 8,
  },
  shardCard: {
    borderColor: 'rgba(223, 255, 107, 0.55)',
  },
  itemCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  itemCard: {
    position: 'relative',
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9,
    paddingRight: 8,
    paddingVertical: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(11, 19, 31, 0.94)',
  },
  itemAccent: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    width: 3,
  },
  itemIconFrame: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(126, 135, 155, 0.25)',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  shieldShopImage: {
    width: 40,
    height: 42,
  },
  shieldIconOuter: {
    width: 29,
    height: 34,
    borderWidth: 2,
    borderRadius: 15,
    transform: [{ rotate: '45deg' }],
  },
  shieldIconInner: {
    position: 'absolute',
    width: 17,
    height: 21,
    borderWidth: 1,
    borderRadius: 10,
    transform: [{ rotate: '45deg' }],
  },
  speedBoostShopImage: {
    width: 40,
    height: 42,
  },
  lockIcon: {
    width: 27,
    height: 23,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
    borderWidth: 1.5,
  },
  lockTop: {
    position: 'absolute',
    top: -12,
    width: 15,
    height: 18,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  lockSlot: {
    width: 4,
    height: 7,
  },
  itemCopy: {
    flex: 1,
    paddingRight: 5,
  },
  itemEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1,
  },
  itemTitle: {
    marginTop: 3,
    color: '#f3f7ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 13,
    letterSpacing: 0.35,
  },
  itemDescription: {
    marginTop: 2,
    color: '#9ca9bb',
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    lineHeight: 10,
  },
  itemStock: {
    marginTop: 4,
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.75,
  },
  itemAction: {
    alignItems: 'flex-end',
    minWidth: 84,
  },
  priceReadout: {
    alignItems: 'flex-end',
    minWidth: 84,
    paddingVertical: 3,
  },
  priceLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    lineHeight: 8,
    letterSpacing: 0.7,
  },
  priceValue: {
    marginTop: 2,
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.35,
    textAlign: 'right',
  },
  shardPriceLabel: {
    color: '#dfff6b',
    fontSize: 8,
    letterSpacing: 0.75,
  },
  lockedPill: {
    minWidth: 66,
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 202, 0.46)',
    backgroundColor: 'rgba(255, 71, 202, 0.06)',
  },
  lockedText: {
    color: '#ff47ca',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.65,
  },
  lockedSubtext: {
    maxWidth: 58,
    marginTop: 3,
    color: '#9ca9bb',
    fontFamily: 'Inter_500Medium',
    fontSize: 6,
    lineHeight: 8,
    textAlign: 'center',
  },
});
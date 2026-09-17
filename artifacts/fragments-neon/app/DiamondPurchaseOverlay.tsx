import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ShardSprite from '../components/ShardSprite';

export type ShardOffer = {
  id: 'SCOUT' | 'NAVIGATOR' | 'KORV9';
  title: string;
  subtitle: string;
  shards: number;
  price: string;
  accent: string;
  tag?: string;
};

export const SHARD_OFFERS: ShardOffer[] = [
  {
    id: 'SCOUT',
    title: 'ÉCLAT DE REPÉRAGE',
    subtitle: 'Pour un dernier renfort avant le prochain secteur.',
    shards: 100,
    price: '0,99 €',
    accent: '#00f3ff',
  },
  {
    id: 'NAVIGATOR',
    title: 'PACK DE NAVIGATION',
    subtitle: 'Le meilleur équilibre pour renforcer le drone.',
    shards: 250,
    price: '2,49 €',
    accent: '#dfff6b',
    tag: 'POPULAIRE',
  },
  {
    id: 'KORV9',
    title: 'CARGAISON KORV-9',
    subtitle: 'Une réserve longue portée pour les secteurs avancés.',
    shards: 500,
    price: '4,99 €',
    accent: '#ff47ca',
    tag: 'MEILLEUR TAUX',
  },
];

export type DiamondOffer = ShardOffer;

type DiamondPurchaseOverlayProps = {
  visible: boolean;
  shards: number;
  vendorSource: number;
  purchaseNotice: string;
  prices?: Partial<Record<ShardOffer['shards'], string>>;
  isPurchasing?: boolean;
  onPurchase: (offer: ShardOffer) => void;
  onClose: () => void;
};

const DiamondPurchaseOverlay = ({
  visible,
  shards,
  vendorSource,
  purchaseNotice,
  prices,
  isPurchasing = false,
  onPurchase,
  onClose,
}: DiamondPurchaseOverlayProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.scrim}>
        <View
          style={[
            styles.shell,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Image
            source={vendorSource}
            style={styles.vendorImage}
            resizeMode="cover"
            accessibilityLabel="Korv-9, marchand de réserve d’éclats"
          />
          <View style={styles.vendorShade} />
          <View style={styles.scanline} />

          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>TERMINAL DE RECHARGE / GOOGLE PLAY</Text>
              <Text style={styles.title}>RÉSERVE{"\n"}D’ÉCLATS</Text>
              <Text style={styles.subtitle}>
                Korv-9 prépare la cargaison. Choisis ton niveau de réserve.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fermer la réserve d’éclats"
              testID="close-shard-purchase"
            >
              <Text style={styles.closeButtonText}>FERMER</Text>
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <ShardSprite size={52} frame={2} />
            <View style={styles.balanceCopy}>
              <Text style={styles.balanceLabel}>RÉSERVE ACTUELLE</Text>
              <Text style={styles.balanceValue}>{shards.toString().padStart(4, '0')}</Text>
            </View>
            <View style={styles.balanceSignal}>
              <View style={styles.signalDot} />
              <Text style={styles.signalText}>PRÊT À CHARGER</Text>
            </View>
          </View>

          <ScrollView
            style={styles.offerScroll}
            contentContainerStyle={styles.offerContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.explanationPanel}>
              <View style={styles.explanationLine} />
              <Text style={styles.explanationTitle}>COMMENT ÇA MARCHE</Text>
              <Text style={styles.explanationText}>
                Les éclats capturés pendant la partie servent à installer des renforts.
                Choisis une réserve pour prolonger ton run : le prix affiché vient de
                l’offre mobile active, et les éclats sont ajoutés après validation.
              </Text>
            </View>

            <View style={styles.offerList}>
              {SHARD_OFFERS.map((offer) => (
                <Pressable
                  key={offer.id}
                  onPress={() => onPurchase(offer)}
                  disabled={isPurchasing}
                  style={({ pressed }) => [
                    styles.offerCard,
                    { borderColor: `${offer.accent}88` },
                    pressed && styles.offerCardPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Acheter ${offer.title}`}
                  accessibilityHint="Toucher n’importe où dans la carte"
                  testID={`buy-shard-pack-${offer.id.toLowerCase()}`}
                >
                  <View style={[styles.offerAccent, { backgroundColor: offer.accent }]} />
                  {offer.tag ? (
                    <View style={[styles.offerTag, { borderColor: `${offer.accent}99` }]}>
                      <Text style={[styles.offerTagText, { color: offer.accent }]}>
                        {offer.tag}
                      </Text>
                    </View>
                  ) : null}
                  <ShardSprite size={50} frame={offer.shards % 4} />
                  <View style={styles.offerCopy}>
                    <Text style={[styles.offerEyebrow, { color: offer.accent }]}>
                      PACK {offer.shards} ÉCLATS
                    </Text>
                    <Text style={styles.offerTitle}>{offer.title}</Text>
                    <Text style={styles.offerSubtitle}>{offer.subtitle}</Text>
                  </View>
                  <View style={styles.offerAction}>
                    <Text style={[styles.offerPrice, { color: offer.accent }]}>
                      {prices?.[offer.shards] ?? offer.price}
                    </Text>
                    <Text style={[styles.buyHint, { color: offer.accent }]}>
                      {isPurchasing ? 'CHARGEMENT' : 'TOUCHER POUR ACHETER'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {purchaseNotice ? (
              <View style={styles.purchaseNotice}>
                <View style={styles.noticeMark}>
                  <Text style={styles.noticeMarkText}>OK</Text>
                </View>
                <Text style={styles.purchaseNoticeText}>{purchaseNotice}</Text>
              </View>
            ) : null}

            <Text style={styles.footerNote}>
              ACHAT SÉCURISÉ / OFFRE MOBILE — LES PRIX SONT FOURNIS PAR LA BOUTIQUE
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default DiamondPurchaseOverlay;

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(1, 4, 11, 0.96)',
  },
  shell: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 14,
    backgroundColor: '#050a14',
  },
  vendorImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.76,
  },
  vendorShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(5, 10, 20, 0.28)',
  },
  scanline: {
    position: 'absolute',
    top: '29%',
    left: -20,
    right: -20,
    height: 1,
    backgroundColor: 'rgba(0, 243, 255, 0.16)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 128,
  },
  headerCopy: {
    flex: 1,
  },
  kicker: {
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.25,
  },
  title: {
    marginTop: 5,
    color: '#f3f7ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 29,
    lineHeight: 29,
    letterSpacing: 1.5,
    textShadowColor: '#00f3ff',
    textShadowRadius: 10,
  },
  subtitle: {
    maxWidth: 250,
    marginTop: 8,
    color: '#c3ccda',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  closeButton: {
    minWidth: 70,
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#00f3ff',
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
  },
  closeButtonText: {
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.9,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    marginTop: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(223, 255, 107, 0.55)',
    backgroundColor: 'rgba(16, 25, 31, 0.88)',
  },
  balanceCopy: {
    flex: 1,
  },
  balanceLabel: {
    color: '#9ca9bb',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1,
  },
  balanceValue: {
    marginTop: 2,
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 23,
    lineHeight: 25,
    letterSpacing: 1.2,
  },
  balanceSignal: {
    alignItems: 'flex-end',
    gap: 5,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dfff6b',
    shadowColor: '#dfff6b',
    shadowOpacity: 0.9,
    shadowRadius: 7,
  },
  signalText: {
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    letterSpacing: 0.65,
  },
  offerScroll: {
    flex: 1,
    marginTop: 12,
  },
  offerContent: {
    paddingBottom: 12,
  },
  explanationPanel: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.28)',
    backgroundColor: 'rgba(0, 24, 34, 0.58)',
  },
  explanationLine: {
    width: 3,
    minHeight: 31,
    backgroundColor: '#00f3ff',
  },
  explanationTitle: {
    flex: 1,
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.9,
  },
  explanationText: {
    width: '100%',
    marginTop: 5,
    paddingLeft: 11,
    color: '#aeb9c9',
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    lineHeight: 13,
  },
  offerList: {
    gap: 8,
    marginTop: 10,
  },
  offerCard: {
    position: 'relative',
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    paddingRight: 8,
    paddingVertical: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(10, 17, 28, 0.94)',
  },
  offerCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  offerAccent: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    left: 0,
    width: 3,
  },
  offerTag: {
    position: 'absolute',
    top: 5,
    right: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
  },
  offerTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    letterSpacing: 0.55,
  },
  offerDiamond: {
    width: 50,
    height: 50,
    marginRight: 8,
  },
  offerCopy: {
    flex: 1,
    paddingRight: 5,
  },
  offerEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.75,
  },
  offerTitle: {
    marginTop: 3,
    color: '#f3f7ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: 0.35,
  },
  offerSubtitle: {
    marginTop: 3,
    color: '#9ca9bb',
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    lineHeight: 11,
  },
  offerAction: {
    alignItems: 'flex-end',
    minWidth: 73,
  },
  offerPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 17,
  },
  buyHint: {
    marginTop: 5,
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    lineHeight: 8,
    letterSpacing: 0.65,
    textAlign: 'right',
  },
  purchaseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 74, 0.55)',
    backgroundColor: 'rgba(184, 255, 74, 0.08)',
  },
  noticeMark: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#b8ff4a',
  },
  noticeMarkText: {
    color: '#b8ff4a',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.4,
  },
  purchaseNoticeText: {
    flex: 1,
    color: '#dfff6b',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.45,
  },
  footerNote: {
    marginTop: 13,
    color: '#68768b',
    fontFamily: 'Inter_700Bold',
    fontSize: 6,
    lineHeight: 9,
    letterSpacing: 0.65,
    textAlign: 'center',
  },
});
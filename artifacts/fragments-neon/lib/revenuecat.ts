import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

export type ShardPackage = {
  productIdentifier: string;
  priceString: string;
  package: PurchasesPackage;
};

export const shardProductIdentifierFor = (shards: number) => `fragments_shards_${shards}`;

const publicKeys = {
  test: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
};

const apiKeyForPlatform = () => (
  __DEV__ || Platform.OS === 'web'
    ? publicKeys.test
    : Platform.OS === 'ios'
      ? publicKeys.ios
      : publicKeys.android
);

let configured = false;

const configureRevenueCat = () => {
  if (configured) return true;
  const apiKey = apiKeyForPlatform();
  if (!apiKey) return false;

  Purchases.configure({ apiKey });
  configured = true;
  return true;
};

export const useShardPurchases = () => {
  const [packages, setPackages] = useState<ShardPackage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!configureRevenueCat()) {
      setIsReady(false);
      return undefined;
    }

    void Purchases.getOfferings()
      .then((offerings) => {
        if (cancelled) return;
        const availablePackages = offerings.current?.availablePackages ?? [];
        setPackages(availablePackages.map((pkg) => ({
          productIdentifier: pkg.product.identifier,
          priceString: pkg.product.priceString,
          package: pkg,
        })));
        setIsReady(true);
      })
      .catch((purchaseError: unknown) => {
        if (cancelled) return;
        setError(purchaseError instanceof Error ? purchaseError.message : 'Offres indisponibles');
        setIsReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const purchase = useCallback(async (purchasePackage: PurchasesPackage) => {
    setIsPurchasing(true);
    setError('');
    try {
      await Purchases.purchasePackage(purchasePackage);
    } catch (purchaseError: unknown) {
      const message = purchaseError instanceof Error ? purchaseError.message : 'Achat annulé';
      setError(message);
      throw purchaseError;
    } finally {
      setIsPurchasing(false);
    }
  }, []);

  return {
    packages,
    isReady,
    isPurchasing,
    error,
    purchase,
  };
};
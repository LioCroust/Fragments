import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const shardSpriteSheet = require('../assets/images/neon-diamond-fragment-sprite-sheet.png');
const FRAME_COUNT = 4;

type ShardSpriteProps = {
  size?: number;
  frame?: number;
};

/**
 * Uses the exact four-frame sprite sheet rendered by the gameplay renderer.
 * The clipped viewport keeps the purchase UI from introducing a second shard
 * illustration with different proportions or lighting.
 */
const ShardSprite = ({ size = 52, frame = 1 }: ShardSpriteProps) => {
  const safeFrame = Math.max(0, Math.min(FRAME_COUNT - 1, frame));
  return (
    <View style={[styles.viewport, { width: size, height: size }]}>
      <Image
        source={shardSpriteSheet}
        resizeMode="stretch"
        style={{
          width: size * FRAME_COUNT,
          height: size,
          left: -safeFrame * size,
        }}
        accessibilityLabel="Sprite d’éclat utilisé en jeu"
      />
    </View>
  );
};

export default React.memo(ShardSprite);

const styles = StyleSheet.create({
  viewport: {
    overflow: 'hidden',
  },
});
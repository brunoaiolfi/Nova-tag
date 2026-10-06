import React from 'react';
import {StyleSheet, View, StyleProp, ViewStyle} from 'react-native';
import {
  ActivityIndicator,
  Button as PaperButton,
  Icon,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import {useAppTheme} from '../../theme';
import type {OrderDetails} from '../../appplication/traceability/workflow';
import {stateLabel} from '../../views/traceability-labels';
import {palette} from '../../theme/tokens';

export const trackingColors = palette;

export function ActionButton({
  contentStyle,
  labelStyle,
  style,
  children,
  mode = 'text',
  disabled,
  loading,
  icon,
  buttonColor,
  textColor,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  onLongPress,
  testID,
}: Omit<React.ComponentProps<typeof PaperButton>, 'style'> & {
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const contained = mode === 'contained' || mode === 'contained-tonal';
  const backgroundColor =
    disabled && contained
      ? '#E2E8F0'
      : contained
      ? buttonColor ?? theme.colors.primary
      : 'transparent';
  const color = disabled
    ? '#68798A'
    : textColor ?? (contained ? theme.colors.onPrimary : theme.colors.primary);
  const borderColor = disabled ? trackingColors.line : theme.colors.outline;
  return (
    <TouchableRipple
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{disabled: !!disabled, busy: !!loading}}
      accessibilityLabel={
        accessibilityLabel ??
        (typeof children === 'string' ? children : undefined)
      }
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={[
        styles.button,
        {backgroundColor, borderColor},
        mode === 'outlined' && styles.outlinedButton,
        style,
      ]}>
      <View style={[styles.buttonContent, contentStyle]}>
        {loading ? (
          <ActivityIndicator size={20} color={color} />
        ) : icon ? (
          <Icon source={icon} size={22} color={color} />
        ) : null}
        <Text style={[styles.buttonLabel, {color}, labelStyle]}>
          {children}
        </Text>
      </View>
    </TouchableRipple>
  );
}

export function PageHero({
  title,
  description,
  icon = 'package-variant-closed',
  eyebrow = 'NFC TRACE · RASTREAMENTO',
  fullBleed = false,
}: {
  title: string;
  description: string;
  icon?: string;
  eyebrow?: string;
  fullBleed?: boolean;
}) {
  return (
    <View style={[styles.hero, fullBleed && styles.fullBleed]}>
      <View style={styles.heroBrand}>
        <Icon source={icon} size={26} color={trackingColors.yellow} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text variant="headlineMedium" style={styles.heroTitle}>
        {title}
      </Text>
      <Text style={styles.heroDescription}>{description}</Text>
    </View>
  );
}

export function ActionTile({
  title,
  description,
  icon,
  onPress,
  accent = false,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableRipple
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={[styles.tile, accent && styles.accentTile]}>
      <View style={styles.tileContent}>
        <View style={styles.tileTop}>
          <Icon source={icon} size={32} color={trackingColors.blue} />
          <Icon
            source="arrow-top-right"
            size={20}
            color={trackingColors.muted}
          />
        </View>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileDescription}>{description}</Text>
      </View>
    </TouchableRipple>
  );
}

/** Decorative route motif, without implying GPS data or a live map. */
export function RouteMotif() {
  return (
    <View
      style={styles.motif}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.routeCurve} />
      <View style={styles.routeOrigin}>
        <Icon
          source="package-variant-closed"
          size={24}
          color={trackingColors.blue}
        />
      </View>
      <View style={styles.routeDestination}>
        <Icon source="map-marker" size={58} color={trackingColors.orange} />
      </View>
    </View>
  );
}

export function ActionRow({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableRipple
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.action}>
      <View style={styles.actionContent}>
        <View style={styles.actionIcon}>
          <Icon source={icon} size={28} color={trackingColors.blue} />
        </View>
        <View style={styles.actionText}>
          <Text variant="titleMedium" style={styles.actionTitle}>
            {title}
          </Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
        <Icon source="chevron-right" size={24} color={trackingColors.muted} />
      </View>
    </TouchableRipple>
  );
}

/** Progress through a form, independent of the order's logistical state. */
export function FlowSteps({
  labels,
  current,
  complete = false,
}: {
  labels: string[];
  current: number;
  complete?: boolean;
}) {
  return (
    <View
      style={styles.steps}
      accessibilityLabel={`Passo ${current} de ${labels.length}: ${
        labels[current - 1]
      }`}>
      {labels.map((label, index) => {
        const done = complete || index + 1 < current;
        const active = index + 1 === current;
        return (
          <View key={label} style={styles.step}>
            <View style={styles.stepRail}>
              {index > 0 && (
                <View
                  style={[
                    styles.stepLine,
                    styles.leftLine,
                    done || active ? styles.doneLine : undefined,
                  ]}
                />
              )}
              {index < labels.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    styles.rightLine,
                    done ? styles.doneLine : undefined,
                  ]}
                />
              )}
              <View
                style={[styles.stepDot, (done || active) && styles.activeDot]}>
                {done ? (
                  <Icon source="check" size={18} color="white" />
                ) : (
                  <Text
                    style={[styles.stepNumber, active && styles.activeNumber]}>
                    {index + 1}
                  </Text>
                )}
              </View>
            </View>
            <Text style={[styles.stepLabel, active && styles.activeLabel]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const milestones = [
  {state: 'CADASTRADO', label: 'Cadastro', icon: 'package-variant-closed'},
  {state: 'COLETADO', label: 'Coleta', icon: 'truck-outline'},
  {state: 'RECEBIDO', label: 'Recebido', icon: 'warehouse'},
  {state: 'ENTREGUE', label: 'Entrega', icon: 'check'},
];

/** Only the persisted order state advances this journey; rejected captures do not. */
export function OrderJourney({
  order,
  fullBleed = false,
}: {
  order: OrderDetails;
  fullBleed?: boolean;
}) {
  const current = milestones.findIndex(item => item.state === order.estado);
  return (
    <View style={[styles.journey, fullBleed && styles.fullBleed]}>
      <Text style={styles.orderEyebrow}>PEDIDO</Text>
      <Text selectable variant="titleLarge" style={styles.orderCode}>
        {order.codigo}
      </Text>
      {!!order.descricao && (
        <Text style={styles.orderDescription}>{order.descricao}</Text>
      )}
      <View style={styles.status}>
        <Icon
          source={current === 3 ? 'check-circle' : 'truck-fast-outline'}
          size={26}
          color={trackingColors.yellow}
        />
        <View style={styles.actionText}>
          <Text style={styles.statusCaption}>Situação atual</Text>
          <Text variant="headlineSmall" style={styles.statusText}>
            {stateLabel(order.estado)}
          </Text>
        </View>
      </View>
      <View style={styles.steps}>
        {milestones.map((item, index) => {
          const reached = current >= 0 && index <= current;
          return (
            <View
              key={item.state}
              style={styles.step}
              accessible
              accessibilityLabel={`${item.label}: ${
                reached
                  ? index === current
                    ? 'etapa atual'
                    : 'concluída'
                  : 'ainda não registrada'
              }`}>
              <View style={styles.stepRail}>
                {index > 0 && (
                  <View
                    style={[
                      styles.stepLine,
                      styles.leftLine,
                      styles.journeyLine,
                      reached && styles.journeyDoneLine,
                    ]}
                  />
                )}
                {index < milestones.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      styles.rightLine,
                      styles.journeyLine,
                      index < current && styles.journeyDoneLine,
                    ]}
                  />
                )}
                <View style={[styles.journeyDot, reached && styles.reachedDot]}>
                  <Icon
                    source={reached && index < current ? 'check' : item.icon}
                    size={20}
                    color={reached ? trackingColors.blue : '#D4DBFF'}
                  />
                </View>
              </View>
              <Text
                style={[styles.journeyLabel, reached && styles.reachedLabel]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
      {order.expedido && (
        <Text style={styles.expedition}>Saída para entrega registrada</Text>
      )}
    </View>
  );
}

export function StatusPanel({
  children,
  tone = 'info',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'error';
}) {
  const color =
    tone === 'success'
      ? trackingColors.teal
      : tone === 'error'
      ? trackingColors.red
      : tone === 'warning'
      ? trackingColors.amber
      : trackingColors.blue;
  const backgroundColor =
    tone === 'success'
      ? trackingColors.green
      : tone === 'error'
      ? trackingColors.redBackground
      : tone === 'warning'
      ? trackingColors.amberBackground
      : trackingColors.pale;
  return (
    <View style={[styles.panel, {backgroundColor, borderLeftColor: color}]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {borderRadius: 18, overflow: 'hidden'},
  outlinedButton: {borderWidth: 1},
  buttonContent: {
    minHeight: 60,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  hero: {
    backgroundColor: trackingColors.blue,
    borderRadius: 26,
    padding: 24,
    gap: 12,
  },
  fullBleed: {borderRadius: 0, paddingBottom: 42},
  heroBrand: {flexDirection: 'row', alignItems: 'center', gap: 10},
  eyebrow: {
    color: '#E2E7FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    flexShrink: 1,
  },
  heroTitle: {color: 'white', fontWeight: '700', fontSize: 28, lineHeight: 35},
  heroDescription: {color: '#E2E7FF', fontSize: 16, lineHeight: 24},
  tile: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: trackingColors.pale,
    overflow: 'hidden',
  },
  accentTile: {backgroundColor: '#FFF0D0'},
  tileContent: {padding: 18, minHeight: 170, gap: 10},
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: trackingColors.navy,
  },
  tileDescription: {fontSize: 14, lineHeight: 21, color: trackingColors.muted},
  motif: {height: 108, width: 210, alignSelf: 'center', marginVertical: 6},
  routeCurve: {
    position: 'absolute',
    left: 25,
    top: 35,
    width: 150,
    height: 52,
    borderWidth: 2,
    borderColor: '#C4CEFF',
    borderTopWidth: 0,
    borderRadius: 40,
    transform: [{rotate: '-12deg'}],
  },
  routeOrigin: {
    position: 'absolute',
    left: 0,
    top: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeDestination: {position: 'absolute', right: 0, top: 0},
  action: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: trackingColors.line,
  },
  actionContent: {
    minHeight: 100,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionIcon: {
    height: 48,
    width: 48,
    borderRadius: 14,
    backgroundColor: trackingColors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {flex: 1, minWidth: 0},
  actionTitle: {fontWeight: '700', color: trackingColors.navy},
  actionDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    color: trackingColors.muted,
  },
  steps: {flexDirection: 'row', paddingVertical: 12},
  step: {flex: 1, minWidth: 0, alignItems: 'center'},
  stepRail: {
    height: 36,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    position: 'absolute',
    height: 2,
    width: '50%',
    backgroundColor: trackingColors.line,
  },
  leftLine: {left: 0},
  rightLine: {right: 0},
  doneLine: {backgroundColor: trackingColors.blue},
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: trackingColors.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {backgroundColor: trackingColors.blue},
  stepNumber: {color: trackingColors.muted, fontWeight: '700'},
  activeNumber: {color: 'white'},
  stepLabel: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: trackingColors.muted,
    marginTop: 7,
    paddingHorizontal: 2,
  },
  activeLabel: {color: trackingColors.blue, fontWeight: '700'},
  journey: {
    backgroundColor: trackingColors.blue,
    padding: 24,
    borderRadius: 26,
    gap: 8,
  },
  orderEyebrow: {
    color: '#E2E7FF',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  orderCode: {color: 'white', fontWeight: '700', fontSize: 28, lineHeight: 35},
  orderDescription: {color: '#E2E7FF', fontSize: 15, lineHeight: 23},
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  statusCaption: {color: '#E2E7FF', fontSize: 14},
  statusText: {color: 'white', fontWeight: '700'},
  journeyDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4962E3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachedDot: {backgroundColor: 'white'},
  journeyLine: {backgroundColor: '#6F82E9'},
  journeyDoneLine: {backgroundColor: 'white'},
  journeyLabel: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#D4DBFF',
    marginTop: 8,
    paddingHorizontal: 1,
  },
  reachedLabel: {color: 'white', fontWeight: '700'},
  expedition: {color: trackingColors.yellow, fontSize: 14, lineHeight: 21},
  panel: {padding: 20, borderRadius: 20, borderLeftWidth: 3, gap: 12},
});

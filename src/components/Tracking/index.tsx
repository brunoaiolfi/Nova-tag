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

export const trackingColors = {
  navy: '#102D46',
  blue: '#155EEF',
  teal: '#087F71',
  muted: '#526779',
  line: '#D6E1EB',
  pale: '#EAF1FA',
  green: '#E8F6F1',
  red: '#B42318',
  redBackground: '#FFF0ED',
  amber: '#8A4B08',
  amberBackground: '#FFF5DF',
};

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
}: {
  title: string;
  description: string;
  icon?: string;
  eyebrow?: string;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroBrand}>
        <Icon source={icon} size={28} color="#9BDAD3" />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text variant="headlineMedium" style={styles.heroTitle}>
        {title}
      </Text>
      <Text style={styles.heroDescription}>{description}</Text>
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
export function OrderJourney({order}: {order: OrderDetails}) {
  const current = milestones.findIndex(item => item.state === order.estado);
  return (
    <View style={styles.journey}>
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
          color="#9BDAD3"
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
                    color={reached ? trackingColors.navy : '#A7BBCD'}
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
  button: {borderRadius: 12},
  outlinedButton: {borderWidth: 1},
  buttonContent: {
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
  },
  hero: {
    backgroundColor: trackingColors.navy,
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  heroBrand: {flexDirection: 'row', alignItems: 'center', gap: 10},
  eyebrow: {
    color: '#BED0DF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    flexShrink: 1,
  },
  heroTitle: {color: 'white', fontWeight: '700', lineHeight: 36},
  heroDescription: {color: '#D5E1EC', fontSize: 16, lineHeight: 24},
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2EAF2',
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
    backgroundColor: trackingColors.navy,
    padding: 20,
    borderRadius: 20,
    gap: 8,
  },
  orderEyebrow: {
    color: '#BED0DF',
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  orderCode: {color: 'white', fontWeight: '700', fontSize: 23, lineHeight: 30},
  orderDescription: {color: '#BED0DF', fontSize: 14, lineHeight: 21},
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  statusCaption: {color: '#BED0DF', fontSize: 14},
  statusText: {color: 'white', fontWeight: '700'},
  journeyDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E405D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reachedDot: {backgroundColor: '#9BDAD3'},
  journeyLine: {backgroundColor: '#34536C'},
  journeyDoneLine: {backgroundColor: '#9BDAD3'},
  journeyLabel: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: '#A7BBCD',
    marginTop: 8,
    paddingHorizontal: 1,
  },
  reachedLabel: {color: 'white', fontWeight: '700'},
  expedition: {color: '#9BDAD3', fontSize: 14, lineHeight: 21},
  panel: {padding: 18, borderRadius: 12, borderLeftWidth: 4, gap: 12},
});

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Icon, Text, TouchableRipple} from 'react-native-paper';
import {palette} from '../../theme/tokens';
import type {Material} from '../../domain/administration/operation';

/** Draw the complete control ourselves: iOS Paper checkboxes otherwise look like plain text. */
export function Confirmation({
  label,
  checked,
  disabled,
  onPress,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      aria-checked={checked}
      accessibilityLabel={label}
      accessibilityState={{checked, disabled: !!disabled}}
      style={[
        styles.confirmation,
        checked && styles.selected,
        disabled && styles.disabled,
      ]}>
      <View style={styles.row}>
        <View style={[styles.check, checked && styles.checked]}>
          {checked && <Icon source="check" size={20} color="white" />}
        </View>
        <Text style={styles.confirmLabel}>{label}</Text>
      </View>
    </TouchableRipple>
  );
}

export function Choice({
  title,
  description,
  icon,
  selected,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      aria-checked={selected}
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{checked: selected, disabled: !!disabled}}
      style={[styles.choice, selected && styles.selected]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon source={icon} size={26} color={palette.blue} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.choiceTitle}>{title}</Text>
          <Text style={styles.small}>{description}</Text>
        </View>
        <Icon
          source={selected ? 'radiobox-marked' : 'radiobox-blank'}
          size={24}
          color={selected ? palette.blue : palette.muted}
        />
      </View>
    </TouchableRipple>
  );
}

export function SetupSummary({
  order,
  uid,
  detail,
  compact = false,
}: {
  order: string;
  uid: string;
  detail?: string;
  compact?: boolean;
}) {
  if (compact)
    return (
      <View style={styles.compactSummary}>
        <View style={styles.row}>
          <Text style={[styles.choiceTitle, styles.grow]}>{order}</Text>
          <Text selectable style={styles.uid}>
            {uid}
          </Text>
        </View>
        <Text style={styles.small}>{detail}</Text>
      </View>
    );
  return (
    <View style={styles.summary}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Icon
            source="package-variant-closed"
            size={26}
            color={palette.blue}
          />
        </View>
        <View style={styles.grow}>
          <Text style={styles.order}>{order}</Text>
          <Text style={styles.small}>{detail}</Text>
        </View>
      </View>
      <View style={styles.tag}>
        <Icon source="nfc-variant" size={18} color={palette.muted} />
        <Text selectable style={styles.uid}>
          {uid || 'Etiqueta ainda não lida'}
        </Text>
      </View>
    </View>
  );
}

export function SetupState({
  icon,
  title,
  description,
  tone = 'info',
  compact = false,
}: {
  icon: string;
  title: string;
  description: string;
  tone?: 'info' | 'warning' | 'success' | 'danger';
  compact?: boolean;
}) {
  const color =
    tone === 'warning'
      ? palette.amber
      : tone === 'success'
      ? palette.teal
      : tone === 'danger'
      ? palette.red
      : palette.blue;
  if (compact)
    return (
      <View style={styles.compactState}>
        <View style={styles.row}>
          <Icon source={icon} size={26} color={color} />
          <Text
            accessibilityRole="header"
            style={[styles.compactTitle, styles.grow]}>
            {title}
          </Text>
        </View>
        <Text style={styles.small}>{description}</Text>
      </View>
    );
  return (
    <View style={styles.state}>
      <View
        style={[
          styles.stateIcon,
          {
            backgroundColor:
              tone === 'success'
                ? palette.green
                : tone === 'warning'
                ? palette.amberBackground
                : tone === 'danger'
                ? palette.redBackground
                : palette.pale,
          },
        ]}>
        <Icon source={icon} size={38} color={color} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, styles.center]}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

export function SetupHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.small}>{description}</Text>
    </View>
  );
}

export function OutcomeRow({icon, text}: {icon: string; text: string}) {
  return (
    <View style={styles.outcome}>
      <Icon source={icon} size={22} color={palette.blue} />
      <Text style={styles.outcomeText}>{text}</Text>
    </View>
  );
}

/** No unknown slot is inferred: every missing choice requires an explicit selection. */
export function RecoverySlots({
  materials,
  disabled,
  onChange,
}: {
  materials: (Material | null)[];
  disabled?: boolean;
  onChange: (index: number, value: Material) => void;
}) {
  return (
    <View style={styles.slots}>
      <Text style={styles.choiceTitle}>Chaves para retomar</Text>
      <Text style={styles.small}>
        Atual: antes deste plano · Alvo: nova chave do plano
      </Text>
      {materials.map((choice, i) => (
        <View
          key={i}
          style={[styles.slotRow, choice === null && styles.unknown]}>
          <View style={styles.slotLabel}>
            <Text style={styles.choiceTitle}>Chave {i}</Text>
            {choice === null && (
              <Text style={styles.required}>Seleção pendente</Text>
            )}
          </View>
          <View
            style={styles.segment}
            accessibilityRole="radiogroup"
            accessibilityLabel={`Chave ${i}`}>
            {(['ATUAL', 'ALVO'] as const).map(value => (
              <TouchableRipple
                key={value}
                accessibilityRole="radio"
                aria-checked={choice === value}
                accessibilityLabel={`Chave ${i}: ${
                  value === 'ATUAL' ? 'Atual' : 'Alvo'
                }`}
                accessibilityState={{
                  checked: choice === value,
                  disabled: !!disabled,
                }}
                disabled={disabled}
                onPress={() => onChange(i, value)}
                style={[
                  styles.segmentOption,
                  choice === value && styles.segmentSelected,
                ]}>
                <Text
                  style={[
                    styles.segmentText,
                    choice === value && styles.segmentSelectedText,
                  ]}>
                  {value === 'ATUAL' ? 'Atual' : 'Alvo'}
                </Text>
              </TouchableRipple>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  grow: {flex: 1, minWidth: 0},
  disabled: {opacity: 0.6},
  confirmation: {
    borderWidth: 1.5,
    borderColor: palette.muted,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'white',
  },
  selected: {borderColor: palette.blue, backgroundColor: palette.pale},
  check: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: palette.blue,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {backgroundColor: palette.blue},
  confirmLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: palette.navy,
    fontWeight: '600',
  },
  choice: {
    padding: 14,
    borderWidth: 1.5,
    borderColor: palette.line,
    borderRadius: 16,
    backgroundColor: 'white',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: palette.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: palette.navy,
    fontWeight: '700',
  },
  small: {fontSize: 14, lineHeight: 20, color: palette.muted},
  summary: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: 'white',
    gap: 12,
  },
  compactSummary: {
    gap: 6,
    borderBottomWidth: 1,
    borderColor: palette.line,
    paddingBottom: 12,
  },
  compactState: {gap: 8},
  compactTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    color: palette.navy,
  },
  center: {textAlign: 'center'},
  order: {fontSize: 22, lineHeight: 28, fontWeight: '700', color: palette.navy},
  tag: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 10,
    alignItems: 'center',
  },
  uid: {fontSize: 14, color: palette.muted, flexShrink: 1},
  state: {alignItems: 'center', gap: 10, paddingVertical: 12},
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {fontSize: 25, lineHeight: 31, fontWeight: '700', color: palette.navy},
  description: {
    fontSize: 16,
    lineHeight: 23,
    color: palette.muted,
    textAlign: 'center',
    maxWidth: 340,
  },
  heading: {gap: 6},
  outcome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  outcomeText: {flex: 1, fontSize: 15, lineHeight: 21, color: palette.navy},
  slots: {gap: 2},
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: palette.line,
    gap: 8,
  },
  slotLabel: {flex: 1},
  required: {fontSize: 12, lineHeight: 16, color: palette.amber},
  unknown: {
    backgroundColor: palette.amberBackground,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#E9EDF5',
    padding: 3,
    borderRadius: 12,
  },
  segmentOption: {
    minWidth: 66,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
    paddingHorizontal: 10,
  },
  segmentSelected: {backgroundColor: palette.blue},
  segmentText: {fontSize: 14, fontWeight: '600', color: palette.muted},
  segmentSelectedText: {color: 'white'},
});

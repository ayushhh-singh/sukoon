import { View, Text, TouchableOpacity, StyleSheet, Linking, Modal } from 'react-native';
import { AlertTriangle, Phone, MessageSquare, X } from 'lucide-react-native';
import type { CrisisResources } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, radii, typography } from '../theme';

interface Props {
  resources: CrisisResources;
  onDismiss: () => void;
}

export default function CrisisModal({ resources, onDismiss }: Props) {
  const { c } = useTheme();

  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: c.bgCard }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
            <X size={20} color={c.textMuted} />
          </TouchableOpacity>

          <AlertTriangle size={32} color={c.rose} style={styles.icon} />
          <Text style={[styles.title, { color: c.textPrimary }]}>You Are Not Alone</Text>
          <Text style={[styles.desc, { color: c.textSecondary }]}>
            It sounds like you may be going through a very difficult time.
            Please reach out to one of these resources — trained professionals
            are available 24/7 to help.
          </Text>

          <View style={styles.resources}>
            <TouchableOpacity
              style={[styles.resource, styles.emergency, { borderColor: c.rose }]}
              onPress={() => callNumber(resources.emergency)}
            >
              <Phone size={22} color={c.rose} />
              <View>
                <Text style={[styles.resourceTitle, { color: c.rose }]}>Emergency Services</Text>
                <Text style={[styles.resourceNumber, { color: c.textSecondary }]}>Call {resources.emergency}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resource, { borderColor: c.border }]}
              onPress={() => callNumber('18002333330')}
            >
              <Phone size={22} color={c.accentPrimary} />
              <View>
                <Text style={[styles.resourceTitle, { color: c.textPrimary }]}>Vandrevala Foundation</Text>
                <Text style={[styles.resourceNumber, { color: c.textSecondary }]}>{resources.suicidePrevention}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resource, { borderColor: c.border }]}
              onPress={() => callNumber('9152987821')}
            >
              <MessageSquare size={22} color={c.accentPrimary} />
              <View>
                <Text style={[styles.resourceTitle, { color: c.textPrimary }]}>iCALL (TISS)</Text>
                <Text style={[styles.resourceNumber, { color: c.textSecondary }]}>{resources.crisisText}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resource, { borderColor: c.border }]}
              onPress={() => callNumber('9820466726')}
            >
              <Phone size={22} color={c.accentPrimary} />
              <View>
                <Text style={[styles.resourceTitle, { color: c.textPrimary }]}>AASRA</Text>
                <Text style={[styles.resourceNumber, { color: c.textSecondary }]}>{resources.international}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[styles.reminder, { color: c.textMuted }]}>
            Your safety is the top priority. Please reach out to a professional.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modal: { width: '100%', borderRadius: radii.xl, padding: spacing.xl },
  closeBtn: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 1 },
  icon: { alignSelf: 'center', marginBottom: spacing.md },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, textAlign: 'center', marginBottom: spacing.sm },
  desc: { fontSize: typography.sizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  resources: { gap: spacing.md },
  resource: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, borderWidth: 1 },
  emergency: { borderWidth: 2 },
  resourceTitle: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  resourceNumber: { fontSize: typography.sizes.xs, marginTop: 2 },
  reminder: { fontSize: typography.sizes.xs, textAlign: 'center', marginTop: spacing.lg },
});

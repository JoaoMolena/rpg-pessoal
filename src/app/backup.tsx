import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { exportBackup, importBackup } from '../backup/backup';
import { useConfirm } from '../components/ConfirmDialog';
import { PrimaryButton } from '../components/PrimaryButton';
import { useGame } from '../context/GameContext';
import { colors } from '../theme/game';

type Busy = 'idle' | 'exporting' | 'importing';

interface StatusMessage {
  text: string;
  tone: 'success' | 'error';
}

export default function BackupScreen() {
  const { state, importState } = useGame();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<Busy>('idle');
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const handleExport = async () => {
    setBusy('exporting');
    setStatus(null);
    try {
      const { shared } = await exportBackup(state);
      setStatus(
        shared
          ? { text: 'Backup gerado! Escolha onde salvar o arquivo.', tone: 'success' }
          : {
              text: 'Arquivo gerado, mas este aparelho não oferece compartilhamento.',
              tone: 'error',
            }
      );
    } catch {
      setStatus({ text: 'Não foi possível gerar o backup.', tone: 'error' });
    } finally {
      setBusy('idle');
    }
  };

  const handleImport = async () => {
    setBusy('importing');
    setStatus(null);
    try {
      const result = await importBackup();

      if (result.status === 'canceled') return;

      if (result.status === 'invalid') {
        setStatus({ text: 'Arquivo inválido: não parece um backup do Loopin.', tone: 'error' });
        return;
      }

      const confirmed = await confirm({
        title: 'Importar backup',
        message:
          'Isso substitui todo o progresso atual (XP, missões, sequências e recorrentes). Deseja continuar?',
        confirmLabel: 'Substituir',
        destructive: true,
      });

      if (confirmed) {
        importState(result.state);
        setStatus({ text: 'Backup importado com sucesso.', tone: 'success' });
      }
    } catch {
      setStatus({ text: 'Não foi possível ler o arquivo escolhido.', tone: 'error' });
    } finally {
      setBusy('idle');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.intro}>
        Guarde seu progresso num arquivo para trocar de aparelho ou recuperar os dados se algo der
        errado. O backup é um arquivo <Text style={styles.code}>.json</Text> salvo onde você
        escolher.
      </Text>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons name="export-variant" size={18} color={colors.primarySoft} />
          </View>
          <Text style={styles.cardTitle}>Exportar backup</Text>
        </View>
        <Text style={styles.cardDescription}>
          Gera um arquivo com todas as suas missões, XP, sequências e recorrentes.
        </Text>
        <PrimaryButton
          label={busy === 'exporting' ? 'Gerando...' : 'Exportar backup'}
          icon="download-outline"
          disabled={busy !== 'idle'}
          onPress={handleExport}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons name="import" size={18} color={colors.primarySoft} />
          </View>
          <Text style={styles.cardTitle}>Importar backup</Text>
        </View>
        <Text style={styles.cardDescription}>
          Escolha um arquivo de backup e restaure o progresso a partir dele.
        </Text>
        <View style={styles.warning}>
          <MaterialCommunityIcons name="alert-outline" size={18} color={colors.warning} />
          <Text style={styles.warningText}>
            A importação substitui todo o progresso atual. Você poderá confirmar antes.
          </Text>
        </View>
        <PrimaryButton
          label={busy === 'importing' ? 'Lendo...' : 'Importar backup'}
          icon="upload-outline"
          variant="ghost"
          disabled={busy !== 'idle'}
          onPress={handleImport}
        />
      </View>

      {busy !== 'idle' && <ActivityIndicator color={colors.primary} />}

      {status && (
        <View style={[styles.status, status.tone === 'error' ? styles.statusError : styles.statusOk]}>
          <MaterialCommunityIcons
            name={status.tone === 'error' ? 'alert-circle-outline' : 'check-circle-outline'}
            size={18}
            color={status.tone === 'error' ? colors.danger : colors.success}
          />
          <Text style={[styles.statusText, { color: status.tone === 'error' ? colors.danger : colors.success }]}>
            {status.text}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 13.5,
    lineHeight: 20,
  },
  code: {
    color: colors.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardDescription: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${colors.warning}14`,
    borderRadius: 14,
    padding: 14,
  },
  warningText: {
    flex: 1,
    color: colors.warning,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  statusOk: {
    backgroundColor: `${colors.success}14`,
  },
  statusError: {
    backgroundColor: `${colors.danger}14`,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createInitialState } from '../../domain/reducer';
import { exportBackup, importBackup } from '../backup';
import { BACKUP_FILENAME, serializeBackup } from '../format';

// `expo-file-system` é nativo: aqui ele vira um "arquivo" em memória, o que
// permite testar a gravação e a leitura sem aparelho.
jest.mock('expo-file-system', () => {
  let content = '';
  class MockFile {
    uri: string;
    constructor(first: unknown, second?: string) {
      const base = typeof first === 'string' ? first : 'cache://';
      this.uri = second ? `${base}/${second}` : base;
    }
    create() {}
    async write(value: string) {
      content = value;
    }
    async text() {
      return content;
    }
  }
  return {
    File: MockFile,
    Paths: { cache: 'cache://' },
    __setContent: (value: string) => {
      content = value;
    },
    __getContent: () => content,
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

const fileSystem = FileSystem as unknown as {
  __setContent: (value: string) => void;
  __getContent: () => string;
};
const sharing = jest.mocked(Sharing);
const picker = jest.mocked(DocumentPicker);

const state = createInitialState(new Date(2026, 9, 19, 10, 0, 0));
const assets = [
  {
    name: 'backup.json',
    uri: 'picked://backup.json',
    size: 10,
    mimeType: 'application/json',
    lastModified: 0,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('exportBackup', () => {
  it('grava o backup e abre o compartilhamento do sistema', async () => {
    sharing.isAvailableAsync.mockResolvedValue(true);

    const result = await exportBackup(state);

    expect(result).toEqual({ shared: true });
    expect(fileSystem.__getContent()).toBe(serializeBackup(state));
    expect(sharing.shareAsync).toHaveBeenCalledTimes(1);
    const [uri, options] = sharing.shareAsync.mock.calls[0];
    expect(uri).toContain(BACKUP_FILENAME);
    expect(options).toMatchObject({ mimeType: 'application/json' });
  });

  it('ainda grava o arquivo quando não há compartilhamento disponível', async () => {
    sharing.isAvailableAsync.mockResolvedValue(false);

    const result = await exportBackup(state);

    expect(result).toEqual({ shared: false });
    expect(sharing.shareAsync).not.toHaveBeenCalled();
    expect(fileSystem.__getContent()).toBe(serializeBackup(state));
  });
});

describe('importBackup', () => {
  it('devolve "canceled" quando o usuário fecha o seletor', async () => {
    picker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });

    expect(await importBackup()).toEqual({ status: 'canceled' });
  });

  it('devolve "ok" com o estado validado', async () => {
    fileSystem.__setContent(serializeBackup(state));
    picker.getDocumentAsync.mockResolvedValue({ canceled: false, assets });

    const result = await importBackup();

    expect(result.status).toBe('ok');
    expect(result).toEqual({ status: 'ok', state });
  });

  it('devolve "invalid" para um arquivo que não é backup', async () => {
    fileSystem.__setContent('isso não é um backup');
    picker.getDocumentAsync.mockResolvedValue({ canceled: false, assets });

    expect(await importBackup()).toEqual({ status: 'invalid' });
  });
});

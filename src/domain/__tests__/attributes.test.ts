import { CATEGORY_KEYS } from '../../theme/game';
import type { Completion, QuestCategory } from '../../types';
import { attributeXp, deriveAttributes } from '../attributes';

function completion(category: QuestCategory, xp: number, id = `c-${category}-${xp}`): Completion {
  return { id, questId: `q-${id}`, xp, at: '2026-06-01T12:00:00.000Z', category };
}

describe('attributeXp', () => {
  it('soma o XP por categoria', () => {
    const xp = attributeXp([
      completion('saude', 10),
      completion('saude', 25),
      completion('estudo', 50),
    ]);

    expect(xp.saude).toBe(35);
    expect(xp.estudo).toBe(50);
    expect(xp.lazer).toBe(0);
  });

  it('a soma dos atributos é igual ao XP total (invariante)', () => {
    const completions = [
      completion('saude', 10),
      completion('trabalho', 100),
      completion('outros', 25),
      completion('financas', 7),
    ];

    const total = attributeXp(completions);
    const sum = Object.values(total).reduce((acc, value) => acc + value, 0);
    const expected = completions.reduce((acc, item) => acc + item.xp, 0);

    expect(sum).toBe(expected);
  });

  it('joga categoria desconhecida em "outros" para não perder XP', () => {
    // Simula um log externo/editado à mão com categoria inválida.
    const bogus = { ...completion('saude', 30), category: 'inventada' as QuestCategory };
    const xp = attributeXp([bogus]);

    expect(xp.outros).toBe(30);
    expect(Object.values(xp).reduce((acc, value) => acc + value, 0)).toBe(30);
  });
});

describe('deriveAttributes', () => {
  it('devolve sempre as 7 categorias, zeradas no nível 1', () => {
    const attributes = deriveAttributes([]);

    expect(Object.keys(attributes).sort()).toEqual([...CATEGORY_KEYS].sort());
    for (const key of CATEGORY_KEYS) {
      expect(attributes[key].xp).toBe(0);
      expect(attributes[key].level).toBe(1);
      expect(attributes[key].completions).toBe(0);
      expect(attributes[key].progressIntoLevel).toBe(0);
      expect(attributes[key].levelRange).toBe(50); // 50*(2-1)^2
    }
  });

  it('usa a mesma curva do nível global (50*(L-1)^2)', () => {
    // 450 XP = nível 4 (mesmo limiar do nível global); 800 XP = nível 5.
    expect(deriveAttributes([completion('saude', 450)]).saude.level).toBe(4);
    expect(deriveAttributes([completion('saude', 449)]).saude.level).toBe(3);
    expect(deriveAttributes([completion('saude', 800)]).saude.level).toBe(5);
  });

  it('calcula o progresso dentro do nível do atributo', () => {
    // 500 XP => nível 4 (450..799), 50 de 350 para o nível 5.
    const saude = deriveAttributes([completion('saude', 500)]).saude;

    expect(saude.level).toBe(4);
    expect(saude.progressIntoLevel).toBe(50);
    expect(saude.levelRange).toBe(350);
  });

  it('conta as conclusões de cada atributo separadamente', () => {
    const attributes = deriveAttributes([
      completion('saude', 10),
      completion('saude', 10),
      completion('lazer', 100),
    ]);

    expect(attributes.saude.completions).toBe(2);
    expect(attributes.saude.xp).toBe(20);
    expect(attributes.lazer.completions).toBe(1);
    expect(attributes.estudo.completions).toBe(0);
  });
});

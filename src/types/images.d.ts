/**
 * Assets estáticos de imagem resolvidos pelo Metro.
 *
 * O `expo-env.d.ts` (que normalmente traz essas declarações) é gerado pelo
 * `expo start` e fica fora do Git — sem esta declaração, o `tsc` de um clone
 * limpo (e o CI) não conhece `*.png`.
 */
declare module '*.png' {
  const asset: number;
  export default asset;
}

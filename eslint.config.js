import xelnagaLintConfig from '@k1/xelnaga'

const myXelnagaWorld = [
    ...xelnagaLintConfig.default,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        ignores: ['**/*/{dist,bundle}', '**/eslint/*']
    }
]

export default myXelnagaWorld
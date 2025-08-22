import ruleForNameDefined from './name-defined'
import pkg from '../package.json'

const { name: pkgName, version: pkgVer } = pkg

const xelnagaPlugin = {
    meta: {
        name: pkgName,
        version: pkgVer,
    },
    configs: {},
    rules: {
        'name-defined': ruleForNameDefined
    }
}

export const eslint_global_ns = 'xelnaga-rule'

export default xelnagaPlugin
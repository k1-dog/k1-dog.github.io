import { ESLintUtils, TSESTree, TSESLint } from '@typescript-eslint/utils'
import { eslint_global_ns } from '.'

const ns = `${eslint_global_ns}-vars-defined`

// 规则元数据配置
const meta: ESLintUtils.NamedCreateRuleMeta<
    | 'defined_const_notwith_'
    | 'defined_let_with_'
    | 'defined_arg_with$'
    | 'sniffing_const_other'
    | 'sniffing_let_other'
    | 'sniffing_$_other',
    []
> = {
    type: 'problem',
    docs: {
        description: "萨尔那加-命名规范 [let声明可变变量, 前缀统一使用'_'开头\nconst声明永恒常量, 前缀禁止使用'_'开头]",
    },
    fixable: 'code',
    messages: {
        defined_let_with_: `可变变量 "{{name}}" 需要以下划线'_'开头`,
        sniffing_let_other: '侦测到未同步的Let引用 "{{name}}"',
        defined_const_notwith_: `永恒常量 "{{name}}" 禁止以下划线'_'开头`,
        sniffing_const_other: '侦测到未同步的Const引用 "{{name}}"',
        defined_arg_with$: `函数形参 "{{name}}" 需要以'$'开头`,
        sniffing_$_other: '侦测到未同步的形参引用 "{{name}}"',
    },
    schema: [] // 无额外配置参数
}

const createRule = ESLintUtils.RuleCreator($name => ns)

// 核心规则实现
const ruleForVarsDefined = createRule({
    name: ns,
    meta,
    defaultOptions: [],
    create(context) {
        function XForEach<N>($xList: N[], $callback: ($xList: N, $xIdx: number) => void ) { $xList.forEach($callback) }

        function fixExactlyLogic($fixer: TSESLint.RuleFixer, $sthLocStart: number, $sth: string) {
            return ($callFixAction: ($sthFixing: string) => string) => $fixer.replaceTextRange(
                [$sthLocStart, $sthLocStart + $sth.length],
                $callFixAction($sth)
            )
        }

        function constFixLogic($constStr: string): string {
            let _found1stLetterIdx = 0
            const isLetter = $char => ($char >= 'a' && $char <= 'z') || ($char >= 'A' && $char <= 'Z')
            for (let _i = 0; _i < $constStr.length; _i++) {
                if (isLetter($constStr[_i])) {
                    _found1stLetterIdx = _i
                    break
                }
            }
            const fixConst = $constStr.slice(_found1stLetterIdx)
            return fixConst
        }
        function letFixLogic($letStr: string): string {
            return `_${$letStr}`
        }
        function argumentFixLogic($argument): string {
            return `$${$argument}`
        }

        const lintDispatcher = {
            varLint: function Linter(node: TSESTree.VariableDeclaration) {
                if (node.kind === 'const') {
                    XForEach<TSESTree.LetOrConstOrVarDeclarator>(node.declarations, ($decl) => {
                        const id = $decl.id
                        if (id.type !== 'Identifier' || !id.name.startsWith('_')) return

                        const constLinting = id.name
                        // 报告Const声明节点问题
                        context.report({
                            node: id,
                            messageId: 'defined_const_notwith_',
                            data: { name: constLinting },
                            fix(fixer) {
                                return fixExactlyLogic(fixer, id.range[0], constLinting)(constFixLogic)
                            }
                        })

                        // 获取变量作用域
                        const scope = context.getScope()
                        const variable = scope.set.get(constLinting)
                        if (!variable) return

                        // 处理相关引用节点-[同作用域下]
                        XForEach<TSESLint.Scope.Reference>(variable.references, $ref => {
                            if (!$ref.identifier.parent) return

                            context.report({
                                node: $ref.identifier,
                                messageId: 'sniffing_const_other',
                                data: { name: constLinting },
                                fix(fixer) {
                                    return fixExactlyLogic(fixer, $ref.identifier.range[0], constLinting)(constFixLogic)
                                }
                            })
                        })
                    })
                } else if (node.kind === 'let') {
                    XForEach<TSESTree.LetOrConstOrVarDeclarator>(node.declarations, $decl => {
                        const id = $decl.id
                        if (id.type !== 'Identifier' || id.name.startsWith('_')) return

                        const letLinting = id.name

                        // 报告Let声明节点问题
                        context.report({
                            node: id,
                            messageId: 'defined_let_with_',
                            data: { name: letLinting },
                            fix(fixer) {
                                return fixExactlyLogic(fixer, id.range[0], letLinting)(letFixLogic)
                            }
                        })

                        // 获取变量作用域
                        const scope = context.getScope()
                        const variable = scope.set.get(letLinting)
                        if (!variable) return

                        // 处理相关引用节点-[同作用域下]
                        XForEach<TSESLint.Scope.Reference>(variable.references, $ref => {
                            if (!$ref.identifier.parent) return

                            context.report({
                                node: $ref.identifier,
                                messageId: 'sniffing_let_other',
                                data: { name: letLinting },
                                fix(fixer) {
                                    return fixExactlyLogic(fixer, $ref.identifier.range[0], letLinting)(letFixLogic)
                                }
                            })
                        })
                    })
                }
            },
            argLink: function Linter(
                node:
                    | TSESTree.FunctionDeclaration
                    | TSESTree.FunctionExpression
                    | TSESTree.ArrowFunctionExpression
            ) {
                if (Array.isArray(node.params) && node.params.length > 0) {
                    XForEach<TSESTree.Parameter>(node.params, ($arg) => {
                        if ($arg.type === 'Identifier' && !$arg.name.startsWith('$')) {
                            const argLinting = $arg.name
                            context.report({
                                node: $arg,
                                messageId: 'defined_arg_with$',
                                data: { name: argLinting },
                                fix(fixer) {
                                    return fixExactlyLogic(fixer, $arg.range[0], argLinting)(argumentFixLogic)
                                }
                            })
                            // --- sync for refs
                            const scope = context.getScope()
                            const variable = scope.set.get(argLinting)
                            if (!variable) return

                            XForEach<TSESLint.Scope.Reference>(variable.references, $ref => {
                                if (!$ref.identifier.parent) return

                                context.report({
                                    node: $ref.identifier,
                                    messageId: 'sniffing_$_other',
                                    data: { name: argLinting },
                                    fix(fixer) {
                                        return fixExactlyLogic(fixer, $ref.identifier.range[0], argLinting)(argumentFixLogic)
                                    }
                                })
                            })
                        }
                    })
                }
            }
        }

        return {
            VariableDeclaration: lintDispatcher.varLint,
            FunctionDeclaration: lintDispatcher.argLink,
            ArrowFunctionExpression: lintDispatcher.argLink,
            MethodDefinition: ($node) => {
                if ($node.value.type === 'FunctionExpression') {
                    lintDispatcher.argLink($node.value)
                }
            }
        }
    }
})

export default ruleForVarsDefined
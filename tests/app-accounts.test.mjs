import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/app-accounts.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } })
const { parseAppAccounts } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const accounts = { '塔台': { appleId: 'fixture@example.com', password: ' test-password ' } }

test('accepts the API envelope and legacy map without changing passwords', () => {
  assert.deepEqual(parseAppAccounts({ data: accounts }), accounts)
  assert.deepEqual(parseAppAccounts(accounts), accounts)
})

test('hides malformed or incomplete accounts while retaining valid apps', () => {
  for (const value of [null, [], {}, { appleId: 'a' }, { appleId: '', password: 'p' }, { appleId: 'a', password: ' ' }, { appleId: 'a', password: 123 }]) {
    assert.deepEqual(parseAppAccounts({ data: { ...accounts, Shadowrocket: value } }), accounts)
  }
  for (const payload of [null, [], '<html>error</html>', { data: null }, { data: [] }, { message: 'Unauthorized' }]) {
    assert.deepEqual(parseAppAccounts(payload), {})
  }
})

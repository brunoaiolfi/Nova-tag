const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const sourcePattern = /\.(?:[cm]?[jt]sx?)$/;
const slash = value => value.split(path.sep).join('/');
const uiPackages = new Set([
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-native',
  'react-native-paper',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-toast-message',
]);
const printer = ts.createPrinter({removeComments: true});

function layer(file) {
  if (file === 'src/App.tsx' || file.startsWith('src/bootstrap/')) {
    return 'composition';
  }
  // This gate composes the login screen; it is not a reusable UI primitive.
  if (file === 'src/components/Auth/SessionGate.tsx') {
    return 'composition';
  }
  if (/^src\/(?:appplication|application)\//.test(file)) {
    return 'application';
  }
  if (file.startsWith('src/domain/')) {
    return 'domain';
  }
  if (file.startsWith('src/infra/')) {
    return 'infra';
  }
  if (/^src\/components\/(?:Base|ui)\//.test(file)) {
    return 'shared-ui';
  }
  if (file.startsWith('src/components/')) {
    return 'components';
  }
  if (file.startsWith('src/views/')) {
    return 'views';
  }
  if (file.startsWith('src/navigation/')) {
    return 'navigation';
  }
  if (file.startsWith('src/theme/')) {
    return 'theme';
  }
  return 'unknown';
}

function boundary(sourceLayer, targetLayer) {
  if (sourceLayer === 'domain' && targetLayer !== 'domain') {
    return 'ARCH001';
  }
  if (
    sourceLayer === 'application' &&
    !['domain', 'application'].includes(targetLayer)
  ) {
    return 'ARCH002';
  }
  if (
    sourceLayer === 'infra' &&
    !['domain', 'application', 'infra'].includes(targetLayer)
  ) {
    return 'ARCH003';
  }
  if (
    sourceLayer === 'shared-ui' &&
    !['shared-ui', 'theme'].includes(targetLayer)
  ) {
    return 'ARCH004';
  }
  if (sourceLayer === 'components' && targetLayer === 'views') {
    return 'ARCH005';
  }
  if (
    ['components', 'views', 'navigation'].includes(sourceLayer) &&
    ['infra', 'composition'].includes(targetLayer)
  ) {
    return 'ARCH006';
  }
  if (sourceLayer === 'theme' && targetLayer !== 'theme') {
    return 'ARCH004';
  }
  return null;
}

function allowedUiPackage(name) {
  return (
    uiPackages.has(name) ||
    name.startsWith('@react-navigation/') ||
    name === '@expo/vector-icons' ||
    name.startsWith('@expo/vector-icons/') ||
    name.startsWith('@react-native-vector-icons/')
  );
}

const messages = {
  ARCH001:
    'Domínio depende somente de domínio; não importe aplicação, UI ou SDK.',
  ARCH002: 'Aplicação depende de domínio/portas; adapte a tecnologia em infra.',
  ARCH003: 'Infra não depende de UI, navegação ou composição do app.',
  ARCH004:
    'UI genérica/tema não depende de funcionalidades, telas ou adaptadores.',
  ARCH005:
    'Componente compartilhado não importa tela; extraia o contrato/label.',
  ARCH006:
    'Apresentação não escolhe adaptador; receba serviços pela composição.',
  ARCH007:
    'Pacote externo fora da lista de UI; SDK/rede/storage pertencem a infra.',
  ARCH008: 'Carregamento deve usar literal estático; não esconda dependências.',
  ARCH009:
    'Dependência local não resolvida ou fora de src; não contorne a fronteira.',
  ARCH010:
    'Arquivo em src sem camada conhecida; classifique a fronteira primeiro.',
  ARCH011:
    'Não desative checks críticos nem use ts-ignore/ts-nocheck em produção.',
  ARCH012:
    'Ciclo entre módulos de execução; extraia o contrato/coordenação. Ciclos somente de tipos são permitidos.',
  ARCH013:
    'Tela não importa implementação de outra funcionalidade; extraia um contrato ou formatter compartilhado.',
  ARCH015:
    'Arquivo types é declarativo: mova valores, funções e execução para o módulo responsável; use imports/exports apenas de tipos.',
};

function analyze({root, files, compilerOptions = {}}) {
  const entries = new Map(
    Object.entries(files).map(([name, text]) => [
      path.resolve(root, name),
      text,
    ]),
  );
  const options = {
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    ...compilerOptions,
  };
  const host = {
    fileExists: file =>
      entries.has(path.resolve(file)) || ts.sys.fileExists(file),
    readFile: file => entries.get(path.resolve(file)) ?? ts.sys.readFile(file),
    directoryExists: dir =>
      [...entries.keys()].some(file =>
        file.startsWith(path.resolve(dir) + path.sep),
      ) || ts.sys.directoryExists(dir),
    getCurrentDirectory: () => root,
    realpath: file => file,
  };
  const issues = [];
  const runtimeGraph = new Map(
    [...entries.keys()].map(file => [file, new Set()]),
  );
  for (const [absolute, text] of entries) {
    const from = slash(path.relative(root, absolute));
    const sourceLayer = layer(from);
    const source = ts.createSourceFile(
      absolute,
      text,
      ts.ScriptTarget.Latest,
      true,
    );
    const report = (rule, node, to, statement) => {
      const position = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      );
      issues.push({
        rule,
        from,
        to,
        statement:
          statement ?? printer.printNode(ts.EmitHint.Unspecified, node, source),
        line: position.line + 1,
        column: position.character + 1,
        message: messages[rule],
      });
    };
    if (sourceLayer === 'unknown') {
      report('ARCH010', source, from, '<file>');
    }

    if (/(?:^|\/|\.)types\.[cm]?tsx?$/.test(from)) {
      for (const node of source.statements) {
        const typeImport =
          ts.isImportDeclaration(node) &&
          (node.importClause?.isTypeOnly ||
            (!node.importClause?.name &&
              node.importClause?.namedBindings &&
              ts.isNamedImports(node.importClause.namedBindings) &&
              node.importClause.namedBindings.elements.length > 0 &&
              node.importClause.namedBindings.elements.every(
                item => item.isTypeOnly,
              )));
        const typeExport =
          ts.isExportDeclaration(node) &&
          (node.isTypeOnly ||
            (node.exportClause &&
              ts.isNamedExports(node.exportClause) &&
              node.exportClause.elements.length > 0 &&
              node.exportClause.elements.every(item => item.isTypeOnly)));
        if (
          !ts.isInterfaceDeclaration(node) &&
          !ts.isTypeAliasDeclaration(node) &&
          !typeImport &&
          !typeExport &&
          !ts.isEmptyStatement(node)
        ) {
          report('ARCH015', node, '<runtime-in-types>');
        }
      }
    }

    function dependency(node, specifier) {
      if (!specifier || !ts.isStringLiteralLike(specifier)) {
        report('ARCH008', node, '<dynamic>');
        return;
      }
      const name = specifier.text;
      const resolved = ts.resolveModuleName(
        name,
        absolute,
        options,
        host,
      ).resolvedModule;
      const targetFile = resolved && path.resolve(resolved.resolvedFileName);
      // Assets are only presentation/composition data, never a path to scripts.
      const asset = path.resolve(path.dirname(absolute), name);
      if (
        name.startsWith('.') &&
        /\.(?:png|jpe?g|webp|svg|ttf|otf)$/.test(name) &&
        ['components', 'views', 'shared-ui', 'composition', 'theme'].includes(
          sourceLayer,
        ) &&
        slash(path.relative(root, asset)).startsWith('assets/') &&
        fs.existsSync(asset)
      ) {
        return;
      }
      if (targetFile && entries.has(targetFile)) {
        const to = slash(path.relative(root, targetFile));
        const crossScreen =
          sourceLayer === 'views' &&
          layer(to) === 'views' &&
          to.split('/').length >= 4 &&
          from.split('/')[2] !== to.split('/')[2];
        const rule = crossScreen ? 'ARCH013' : boundary(sourceLayer, layer(to));
        if (rule) {
          report(rule, node, to);
        }
        return;
      }
      if (
        name.startsWith('.') ||
        path.isAbsolute(name) ||
        (targetFile && !resolved.isExternalLibraryImport)
      ) {
        report('ARCH009', node, name);
        return;
      }
      if (sourceLayer === 'domain') {
        report('ARCH001', node, name);
      } else if (sourceLayer === 'application') {
        report('ARCH002', node, name);
      } else if (
        ['components', 'views', 'shared-ui', 'navigation', 'theme'].includes(
          sourceLayer,
        ) &&
        !allowedUiPackage(name)
      ) {
        report('ARCH007', node, name);
      }
    }

    function visit(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          dependency(node, node.moduleSpecifier);
        }
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        dependency(node, node.moduleReference.expression);
      } else if (ts.isImportTypeNode(node)) {
        dependency(
          node,
          ts.isLiteralTypeNode(node.argument) ? node.argument.literal : null,
        );
      } else if (ts.isCallExpression(node)) {
        if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === 'require')
        ) {
          dependency(node, node.arguments[0]);
        } else if (
          (ts.isPropertyAccessExpression(node.expression) ||
            ts.isElementAccessExpression(node.expression)) &&
          ((ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'require') ||
            (ts.isElementAccessExpression(node.expression) &&
              ts.isStringLiteralLike(node.expression.argumentExpression) &&
              node.expression.argumentExpression.text === 'require') ||
            (ts.isIdentifier(node.expression.expression) &&
              node.expression.expression.text === 'require'))
        ) {
          // module.require, require.resolve and similar loaders have no place in src.
          report('ARCH008', node, '<loader>');
        }
      } else if (
        ts.isIdentifier(node) &&
        node.text === 'require' &&
        !(
          ts.isCallExpression(node.parent) && node.parent.expression === node
        ) &&
        !(
          ts.isPropertyAccessExpression(node.parent) &&
          node.parent.name === node
        )
      ) {
        report('ARCH008', node, '<loader-reference>');
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    // Read actual comment tokens, not strings containing documentation examples.
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      text,
    );
    for (
      let token = scanner.scan();
      token !== ts.SyntaxKind.EndOfFileToken;
      token = scanner.scan()
    ) {
      if (
        ![
          ts.SyntaxKind.SingleLineCommentTrivia,
          ts.SyntaxKind.MultiLineCommentTrivia,
        ].includes(token)
      ) {
        continue;
      }
      const comment = scanner.getTokenText();
      const directive =
        /eslint-disable(?:-next-line|-line)?\s*([^\r\n]*?)(?:\*\/)?$/.exec(
          comment,
        );
      const rules = directive?.[1].split(/(?:^|\s)--(?:\s|$)/)[0].trim();
      if (
        /@ts-(?:ignore|nocheck|expect-error)\b/.test(comment) ||
        (directive &&
          (!rules ||
            /\b(?:no-restricted-globals|no-restricted-properties|no-restricted-syntax|no-eval|no-new-func|no-explicit-any|ban-ts-comment|id-length|no-floating-promises|no-misused-promises|no-unsafe-type-assertion|switch-exhaustiveness-check)\b|react-hooks\//.test(
              rules,
            )))
      ) {
        const position = source.getLineAndCharacterOfPosition(
          scanner.getTokenPos(),
        );
        issues.push({
          rule: 'ARCH011',
          from,
          to: '<suppression>',
          statement: comment,
          line: position.line + 1,
          column: position.character + 1,
          message: messages.ARCH011,
        });
      }
    }
    if (!/\.d\.[cm]?ts$/.test(absolute)) {
      // Analyze emitted imports: ordinary TS imports used only as types disappear too.
      const emitted = ts.transpileModule(text, {
        fileName: absolute,
        compilerOptions: {
          ...options,
          module: ts.ModuleKind.ESNext,
          verbatimModuleSyntax: options.verbatimModuleSyntax ?? false,
          jsx: ts.JsxEmit.Preserve,
        },
      }).outputText;
      const runtime = ts.createSourceFile(
        absolute,
        emitted,
        ts.ScriptTarget.Latest,
        true,
      );
      const collect = node => {
        let specifier;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          specifier = node.moduleSpecifier;
        } else if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) &&
              node.expression.text === 'require'))
        ) {
          specifier = node.arguments[0];
        }
        if (specifier && ts.isStringLiteralLike(specifier)) {
          const resolved = ts.resolveModuleName(
            specifier.text,
            absolute,
            options,
            host,
          ).resolvedModule;
          const target = resolved && path.resolve(resolved.resolvedFileName);
          if (entries.has(target)) {
            runtimeGraph.get(absolute).add(target);
          }
        }
        ts.forEachChild(node, collect);
      };
      collect(runtime);
    }
  }
  const index = new Map(),
    low = new Map(),
    stack = [],
    active = new Set();
  function component(file) {
    index.set(file, index.size);
    low.set(file, index.get(file));
    stack.push(file);
    active.add(file);
    for (const target of runtimeGraph.get(file)) {
      if (!index.has(target)) {
        component(target);
        low.set(file, Math.min(low.get(file), low.get(target)));
      } else if (active.has(target)) {
        low.set(file, Math.min(low.get(file), index.get(target)));
      }
    }
    if (low.get(file) !== index.get(file)) {
      return;
    }
    const group = [];
    let target;
    do {
      target = stack.pop();
      active.delete(target);
      group.push(target);
    } while (target !== file);
    if (group.length > 1 || runtimeGraph.get(file).has(file)) {
      const names = group.map(item => slash(path.relative(root, item))).sort();
      issues.push({
        rule: 'ARCH012',
        from: names[0],
        to: names.join(', '),
        statement: '<runtime-cycle>',
        line: 1,
        column: 1,
        message: messages.ARCH012,
      });
    }
  }
  for (const file of runtimeGraph.keys()) {
    if (!index.has(file)) {
      component(file);
    }
  }
  return issues;
}

const key = item =>
  JSON.stringify([item.rule, item.from, item.to, item.statement]);
function applyExceptions(issues, exceptions) {
  const remaining = new Map();
  for (const exception of exceptions) {
    if (
      !/^(?:ARCH00[1-7]|ARCH013)$/.test(exception.rule) ||
      !exception.from?.startsWith('src/') ||
      !exception.to ||
      !exception.statement ||
      !exception.reason?.trim() ||
      remaining.has(key(exception))
    ) {
      throw Error(
        'Exceção inválida, duplicada ou sem justificativa arquitetural.',
      );
    }
    remaining.set(key(exception), exception);
  }
  const errors = [];
  let accepted = 0;
  for (const issue of issues) {
    if (remaining.delete(key(issue))) {
      accepted++;
    } else {
      errors.push(issue);
    }
  }
  for (const exception of remaining.values()) {
    errors.push({
      ...exception,
      line: 1,
      column: 1,
      message:
        'Exceção obsoleta: remova-a; não pode ser reutilizada por outra dependência.',
    });
  }
  return {errors, accepted};
}

function readProject(root) {
  const files = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const absolute = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        throw Error('Symlink em src não é permitido pelo verificador.');
      }
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (sourcePattern.test(entry.name)) {
        files[slash(path.relative(root, absolute))] = fs.readFileSync(
          absolute,
          'utf8',
        );
      }
    }
  }
  walk(path.join(root, 'src'));
  const config = ts.readConfigFile(
    path.join(root, 'tsconfig.json'),
    ts.sys.readFile,
  );
  if (config.error) {
    throw Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (parsed.errors.length) {
    throw Error(
      ts.flattenDiagnosticMessageText(parsed.errors[0].messageText, '\n'),
    );
  }
  return {root, files, compilerOptions: parsed.options};
}

function main() {
  const root = path.resolve(__dirname, '../..');
  const project = readProject(root);
  const exceptions = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'exceptions.json'), 'utf8'),
  );
  const result = applyExceptions(analyze(project), exceptions);
  for (const issue of result.errors) {
    process.stderr.write(
      `${issue.from}:${issue.line}:${issue.column} ${issue.rule} ${issue.message}\n  -> ${issue.to}\n  ${issue.statement}\n`,
    );
  }
  if (result.errors.length) {
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Arquitetura: ${
        Object.keys(project.files).length
      } arquivos verificados; ${
        result.accepted
      } dependências legadas exatas. Nenhuma nova violação.\n`,
    );
  }
}

module.exports = {analyze, applyExceptions, readProject};
if (require.main === module) {
  main();
}

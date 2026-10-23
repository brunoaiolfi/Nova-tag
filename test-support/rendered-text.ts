import type {
  ReactTestRenderer,
  ReactTestRendererJSON,
} from 'react-test-renderer';

/** Inspect rendered text and accessibility labels, not elements/data stored in list props. */
export function renderedText(tree: ReactTestRenderer): string {
  function read(
    node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null,
  ): string {
    if (node === null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(read).join('');
    const accessibilityLabel =
      typeof node.props.accessibilityLabel === 'string'
        ? node.props.accessibilityLabel
        : '';
    return accessibilityLabel + (node.children?.map(read).join('') ?? '');
  }
  return read(tree.toJSON());
}

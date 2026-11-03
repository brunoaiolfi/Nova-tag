/** Read only rendered children and labels; never inspect elements stored in props. */
export function renderedText(tree: {toJSON(): unknown}): string {
  function read(node: unknown): string {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(read).join('');
    if (node === null || typeof node !== 'object') return '';
    const props =
      'props' in node && node.props && typeof node.props === 'object'
        ? node.props
        : {};
    const label =
      'accessibilityLabel' in props &&
      typeof props.accessibilityLabel === 'string'
        ? props.accessibilityLabel
        : '';
    const children =
      'children' in node && Array.isArray(node.children) ? node.children : [];
    const textElement =
      'type' in node &&
      typeof node.type === 'string' &&
      /Text$/.test(node.type);
    return (
      (label ? label + ' ' : '') +
      children.map(read).join(textElement ? '' : ' ')
    );
  }
  return read(tree.toJSON());
}

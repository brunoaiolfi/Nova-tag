import React from 'react';
import {render, screen} from '@testing-library/react-native';
import App from '../src/App';

test('renders correctly', async () => {
  await render(<App />);
  expect(await screen.findByRole('button', {name: 'Entrar'})).toBeVisible();
});

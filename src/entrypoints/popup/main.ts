import { mount } from 'svelte';
import App from './App.svelte';
import '../../ui/tokens.css';
import './app.css';
import { getSettings, onSettingsChanged, applyTheme } from '../../core/settings';

const root = document.documentElement;
void getSettings().then((s) => applyTheme(root, s.theme));
onSettingsChanged((s) => applyTheme(root, s.theme));

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;

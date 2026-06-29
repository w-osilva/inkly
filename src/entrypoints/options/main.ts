import { mount } from 'svelte';
import App from './App.svelte';
import '../../ui/tokens.css';
import { getSettings, onSettingsChanged, applyTheme } from '../../core/settings';

const root = document.documentElement;
void getSettings().then((s) => applyTheme(root, s.theme));
onSettingsChanged((s) => applyTheme(root, s.theme));

mount(App, { target: document.getElementById('app')! });

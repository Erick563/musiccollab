// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock do console para evitar logs desnecessários durante testes
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock do WebSocket e Socket.io para testes que usam colaboração em tempo real
global.WebSocket = jest.fn(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
}));

// Mock do AudioContext para testes de componentes de áudio
window.AudioContext = jest.fn().mockImplementation(() => ({
  createBufferSource: jest.fn(),
  createGain: jest.fn(),
  decodeAudioData: jest.fn(),
  close: jest.fn(),
  destination: {},
}));

// Mock completo do HTMLMediaElement para componentes de áudio/vídeo
// Criar um mock funcional antes de qualquer teste tentar usar
const mockPlay = jest.fn(() => Promise.resolve());
const mockPause = jest.fn();
const mockLoad = jest.fn();

HTMLMediaElement.prototype.play = mockPlay;
HTMLMediaElement.prototype.pause = mockPause;
HTMLMediaElement.prototype.load = mockLoad;

// Mock de propriedades do HTMLMediaElement
Object.defineProperties(HTMLMediaElement.prototype, {
  duration: {
    get: jest.fn(() => 0),
    configurable: true,
  },
  currentTime: {
    get: jest.fn(() => 0),
    set: jest.fn(),
    configurable: true,
  },
  volume: {
    get: jest.fn(() => 1),
    set: jest.fn(),
    configurable: true,
  },
});

// Mock de matchMedia para testes responsivos
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});


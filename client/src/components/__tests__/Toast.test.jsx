import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import Toast, { ToastContainer } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('deve renderizar a mensagem do toast', () => {
    const onClose = jest.fn();
    render(<Toast message="Teste de mensagem" type="info" onClose={onClose} />);

    expect(screen.getByText('Teste de mensagem')).toBeInTheDocument();
  });

  it('deve exibir o ícone correto para cada tipo', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <Toast message="Sucesso" type="success" onClose={onClose} />
    );
    expect(screen.getByText('✅')).toBeInTheDocument();

    rerender(<Toast message="Aviso" type="warning" onClose={onClose} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    rerender(<Toast message="Erro" type="error" onClose={onClose} />);
    expect(screen.getByText('❌')).toBeInTheDocument();

    rerender(<Toast message="Info" type="info" onClose={onClose} />);
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('deve chamar onClose após a duração especificada', () => {
    const onClose = jest.fn();
    render(<Toast message="Teste" type="info" duration={3000} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    // Avançar tempo para 3000ms (duração) + 300ms (animação)
    jest.advanceTimersByTime(3300);

    expect(onClose).toHaveBeenCalled();
  });

  it('deve aplicar a classe "hiding" antes de fechar', async () => {
    const onClose = jest.fn();
    const { container } = render(
      <Toast message="Teste" type="info" duration={1000} onClose={onClose} />
    );

    const toastElement = container.querySelector('.toast');
    expect(toastElement).not.toHaveClass('hiding');

    // Avançar para quando o hiding começa (após a duração)
    jest.advanceTimersByTime(1000);

    // Forçar re-render verificando o DOM atualizado
    await waitFor(() => {
      const updatedElement = container.querySelector('.toast');
      expect(updatedElement).toHaveClass('hiding');
    });
  });

  it('deve aplicar a classe CSS correta baseada no tipo', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Toast message="Teste" type="success" onClose={onClose} />
    );

    const toastElement = container.querySelector('.toast');
    expect(toastElement).toHaveClass('success');
  });
});

describe('ToastContainer', () => {
  it('deve renderizar múltiplos toasts', () => {
    const toasts = [
      { id: 1, message: 'Toast 1', type: 'info', duration: 3000 },
      { id: 2, message: 'Toast 2', type: 'success', duration: 3000 },
      { id: 3, message: 'Toast 3', type: 'error', duration: 3000 },
    ];

    const onRemoveToast = jest.fn();

    render(<ToastContainer toasts={toasts} onRemoveToast={onRemoveToast} />);

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
  });

  it('deve chamar onRemoveToast quando um toast fechar', () => {
    jest.useFakeTimers();

    const toasts = [
      { id: 1, message: 'Toast 1', type: 'info', duration: 1000 },
    ];

    const onRemoveToast = jest.fn();

    render(<ToastContainer toasts={toasts} onRemoveToast={onRemoveToast} />);

    // Avançar tempo para fechar o toast
    jest.advanceTimersByTime(1300);

    expect(onRemoveToast).toHaveBeenCalledWith(1);

    jest.useRealTimers();
  });

  it('deve renderizar lista vazia quando não há toasts', () => {
    const onRemoveToast = jest.fn();
    const { container } = render(
      <ToastContainer toasts={[]} onRemoveToast={onRemoveToast} />
    );

    const toastContainer = container.querySelector('.toast-container');
    expect(toastContainer).toBeInTheDocument();
    expect(toastContainer.children).toHaveLength(0);
  });
});


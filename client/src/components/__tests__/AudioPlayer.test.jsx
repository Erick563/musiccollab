import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AudioPlayer from '../AudioPlayer';

describe('AudioPlayer', () => {
  const mockTrack = {
    id: '1',
    name: 'Test Track',
    url: 'test-audio.mp3',
    volume: 80,
    color: '#ff0000',
    file: {
      name: 'test-audio.mp3'
    }
  };

  const mockOnPlayPause = jest.fn();
  const mockOnStop = jest.fn();
  const masterVolume = 100;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o player com as informações da track', () => {
    render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
  });

  it('deve exibir o botão de play quando não está tocando', () => {
    render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByText('▶')).toBeInTheDocument();
  });

  it('deve chamar onPlayPause ao clicar no botão de play/pause', () => {
    render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    const playButton = screen.getByTitle('Play');
    fireEvent.click(playButton);

    expect(mockOnPlayPause).toHaveBeenCalledTimes(1);
  });

  it('deve chamar onStop ao clicar no botão de stop', () => {
    render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    const stopButton = screen.getByTitle('Stop');
    fireEvent.click(stopButton);

    expect(mockOnStop).toHaveBeenCalledTimes(1);
  });

  it('deve formatar o tempo corretamente', () => {
    render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    // Por padrão, deve exibir 0:00 quando não há duração
    const timeDisplays = screen.getAllByText('0:00');
    expect(timeDisplays.length).toBeGreaterThan(0);
  });

  it('deve exibir o indicador de cor da track', () => {
    const { container } = render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    const colorIndicator = container.querySelector('.track-color-indicator');
    expect(colorIndicator).toBeInTheDocument();
    expect(colorIndicator).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('deve exibir mensagem de carregamento quando não está carregado', () => {
    render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    expect(screen.getByText('⏳ Carregando...')).toBeInTheDocument();
  });

  it('deve renderizar o elemento de áudio com a URL correta', () => {
    const { container } = render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    const audioElement = container.querySelector('audio');
    expect(audioElement).toBeInTheDocument();
    expect(audioElement).toHaveAttribute('src', 'test-audio.mp3');
  });

  it('deve exibir a barra de progresso', () => {
    const { container } = render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    const progressBar = container.querySelector('.progress-bar');
    expect(progressBar).toBeInTheDocument();
  });

  it('deve resetar o estado quando a track mudar', () => {
    const { rerender } = render(
      <AudioPlayer 
        track={mockTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    const newTrack = {
      ...mockTrack,
      id: '2',
      name: 'New Track'
    };

    rerender(
      <AudioPlayer 
        track={newTrack}
        isPlaying={false}
        onPlayPause={mockOnPlayPause}
        onStop={mockOnStop}
        masterVolume={masterVolume}
      />
    );

    expect(screen.getByText('New Track')).toBeInTheDocument();
  });
});

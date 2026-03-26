export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: 'signal-processing' | 'control' | 'data-analysis';
  thumbnail?: string;
  content: string;
}

export const projects: Project[] = [
  {
    id: 'ecg-filtering',
    title: 'ECG Signal Filtering System',
    description: 'Implemented Butterworth bandpass filter for noise reduction in cardiac signals',
    tags: ['Python', 'MATLAB', 'Signal Processing', 'DSP'],
    category: 'signal-processing',
    content: `
# ECG Signal Filtering System

To filter noise in ECG signals, we use a Butterworth filter of order-n with cutoff frequency $\\omega_c$:

$$|H(j\\omega)| = \\frac{1}{\\sqrt{1 + (\\frac{\\omega}{\\omega_c})^{2n}}}$$

## Implementation

The system processes raw ECG signals through a pipeline that includes:

- Bandpass filtering (0.5-40 Hz)
- Notch filtering for 60 Hz power line interference
- Wavelet denoising for high-frequency artifacts

## Results

The filtered signals show significant improvement in SNR, with QRS complexes clearly distinguishable from background noise.

\`\`\`mermaid
graph TD
    A[Raw ECG Signal] --> B{Apply Filter?}
    B -- Yes --> C[Bandpass Filter 0.5-40Hz]
    B -- No --> D[Analyze Raw Signal]
    C --> E[QRS Wave Detection]
    E --> F[Heart Rate Calculation]
\`\`\`
    `.trim()
  },
  {
    id: 'emg-analysis',
    title: 'EMG Signal Analysis for Prosthetic Control',
    description: 'Real-time EMG signal processing for myoelectric prosthetic hand control',
    tags: ['Arduino', 'C++', 'Signal Processing', 'Machine Learning'],
    category: 'signal-processing',
    content: `
# EMG Signal Analysis for Prosthetic Control

EMG signals can be modeled as:

$$x(t) = \\sum_{i=1}^{N} a_i \\cdot s(t - \\tau_i) + n(t)$$

where $a_i$ are amplitude coefficients, $\\tau_i$ are time delays, and $n(t)$ is additive noise.

## Feature Extraction

Key features extracted from EMG signals:
- Root Mean Square (RMS)
- Mean Absolute Value (MAV)
- Zero Crossing Rate
- Slope Sign Changes
- Waveform Length

## Classification

Using Support Vector Machines (SVM) to classify different hand gestures with 95% accuracy.
    `.trim()
  },
  {
    id: 'mri-segmentation',
    title: 'Brain MRI Segmentation',
    description: 'Automated brain tumor segmentation using deep learning',
    tags: ['Python', 'TensorFlow', 'Deep Learning', 'Medical Imaging'],
    category: 'data-analysis',
    content: `
# Brain MRI Segmentation

Segmentation of brain tumors from MRI scans using U-Net architecture.

## Methodology

The U-Net architecture follows an encoder-decoder structure:

\`\`\`mermaid
graph TD
    A[Input MRI] --> B[Encoder]
    B --> C[Bottleneck]
    C --> D[Decoder]
    D --> E[Segmentation Mask]
    B --> F[Skip Connection]
    F --> D
\`\`\`

## Results

Achieved Dice coefficient of 0.89 on test dataset.
    `.trim()
  },
  {
    id: 'pulse-oximeter',
    title: 'Low-Cost Pulse Oximeter',
    description: 'Design and development of an affordable pulse oximeter for remote areas',
    tags: ['Arduino', 'Hardware Design', 'Embedded Systems', 'Biomedical'],
    category: 'control',
    content: `
# Low-Cost Pulse Oximeter

Design of a portable pulse oximeter using red and infrared LEDs for SpO2 measurement.

## Principle

SpO2 is calculated using Beer-Lambert law:

$$SpO2 = \\frac{HbO_2}{HbO_2 + Hb} \\times 100\\%$$

## Hardware Design

- Dual wavelength LED driver
- Photodetector amplifier
- Microcontroller for signal processing
- OLED display for readings

## Cost Reduction

Total BOM cost under $15, making it suitable for developing regions.
    `.trim()
  },
  {
    id: 'eeg-bci',
    title: 'EEG-based BCI for Motor Imagery',
    description: 'Brain-computer interface for controlling robotic arm using motor imagery',
    tags: ['Python', 'OpenBCI', 'Machine Learning', 'Signal Processing'],
    category: 'signal-processing',
    content: `
# EEG-based BCI for Motor Imagery

Classification of motor imagery tasks from EEG signals using Common Spatial Patterns (CSP).

## Signal Processing Pipeline

1. **Preprocessing**: Bandpass filter (8-30 Hz)
2. **Feature Extraction**: CSP algorithm
3. **Classification**: Linear Discriminant Analysis (LDA)

## Mathematical Foundation

CSP maximizes the variance difference between two classes:

$$w = \\arg\\max_{w} \\frac{w^T \\Sigma_1 w}{w^T \\Sigma_2 w}$$

where $\\Sigma_1$ and $\\Sigma_2$ are covariance matrices for each class.
    `.trim()
  },
  {
    id: 'glucose-monitor',
    title: 'Non-invasive Glucose Monitor',
    description: 'Research on non-invasive glucose monitoring using infrared spectroscopy',
    tags: ['MATLAB', 'Signal Processing', 'Spectroscopy', 'Machine Learning'],
    category: 'control',
    content: `
# Non-invasive Glucose Monitor

Development of a non-invasive glucose monitoring system using near-infrared spectroscopy.

## Spectroscopy Principle

Absorbance follows Beer-Lambert law:

$$A = \\log_{10}\\left(\\frac{I_0}{I}\\right) = \\epsilon \\cdot c \\cdot l$$

where $\\epsilon$ is molar absorptivity, $c$ is concentration, and $l$ is path length.

## Calibration Model

Partial Least Squares Regression (PLSR) used for multivariate calibration:

$$X = T P^T + E$$
$$Y = U Q^T + F$$

concentration.
    `.trim()
  },
  {
    id: 'biomedical-robotics-control',
    title: 'Biomedical Robotics · Control Systems Integration',
    description: 'Real-time multi-modal biosensor fusion (ECG, EMG, EEG, SpO2) with PID feedback control driving a multi-jointed robotic arm manipulator',
    tags: ['Robotics', 'PID Control', 'Biosensors', 'EMG Processing', 'ECG Analysis', 'BCI'],
    category: 'control',
    thumbnail: undefined, // Optional future SVG
    content: `
# Biomedical Robotics Control Systems Integration

## System Overview

The biomedical robotics platform integrates multiple physiological signals into a unified control system:

$$u(t) = K_p e(t) + K_i \\int e(t) dt + K_d \\frac{de(t)}{dt}$$

where error \\\\$e(t) = r(t) - y(t)\\\\ is derived from fused biosensor data.

## Schematic Architecture

\`\`\`mermaid
graph TB
  subgraph id1 ["🔷 Technical Biomedical Robotics Schematic"]
    style id1 fill:#0a1428,stroke:#00bfff,stroke-width:3px,stroke-dasharray: 5 5
    
    subgraph ECG ["ECG SIGNAL 🟢 LIVE"]
      BASELINE["~~~~~~~ baseline wander"]:::baseline
      ECG1["P-QRS-T"]:::ecgpeak
      ECG2["P'-QRS'-T'<br/>var RR int."]:::ecgpeak
      style ECG fill:#001a00,stroke:#00ff44,stroke-width:5px
    subgraph EMG ["RAW EMG 🟣 0.4mV"]
      BURST1["^^^/\\\\\\/\\^ burst"]:::emgchaotic
      BURST2["\^/\\/\\^\\^\\/ rest"]:::emgchaotic
      BURST3["\\/\^/\\/ burst"]:::emgchaotic
      style EMG fill:#1a001a,stroke:#aa44ff,stroke-width:5px
      classDef emgchaotic fill:#660066,stroke:#cc66ff,stroke-width:3px
      classDef baseline stroke:#44aa44,stroke-dasharray: 2 2
    subgraph CONTROL ["PID FEEDBACK 🔵"]
      REF["REF r(t)"] --> ERROR["(ERROR e(t))"]
      FEED["FEEDBACK y(t)"] -.->|"dashed"| ERROR
      ERROR --> PID["PID:<br/>Kp ∫ Ki d/dt Kd"]
      PID --> PLANT["PLANT Arm"]
      PLANT --> FEED
      style CONTROL fill:#000a22,stroke:#4488ff,stroke-width:5px
      classDef dashed stroke-dasharray: 8 5, stroke:#66aaff
      linkStyle 6 stroke-dasharray: 8 5
    subgraph BIOSENSORS ["BIOSENSORS 🟡"]
      SpO2[SpO2: 98% 🟢]
      EMGv[EMG: 0.4mV 🟣]
      EEGf[EEG: 12Hz 🔵]
      LEGEND[Legend:<br/>🟢=OK 🟣=Active 🔵=Processing 🟡=Monitor]
      style BIOSENSORS fill:#332200,stroke:#ffaa00,stroke-width:4px
      classDef yellowStatus fill:#ffcc88,stroke:#aa8800
      class SpO2,EMGv,EEGf,LEGEND yellowStatus
    ARM["🦾 Multi-Jointed<br/>Robotic Arm<br/>💙 Energy Joints"]
    style ARM fill:#112244,stroke:#44aaff,stroke-width:5px
    
    %% Connections - colored dotted lines
    ECG -.->|Green Signal| ARM
    EMG -.->|"Purple Burst"| ARM
    CONTROL -.->|"Blue Control"| ARM
    BIOSENSORS -.->|"Status Fusion"| ARM
    
    %% Bottom text
    TEXT["BIOMEDICAL ROBOTICS · SIGNAL SYSTEMS"]
    style TEXT fill:#ffffff,stroke:#00bfff,stroke-width:2px,font-size:20px
    
  %% Neon grid glow
  classDef baseline stroke:#44aa44,stroke-width:1.5px,stroke-dasharray: 1 3
  classDef ecgpeak fill:#004400,stroke:#00ff88,stroke-width:3px
  classDef emgchaotic fill:#660066,stroke:#cc66ff,stroke-width:3px
  classDef dashed stroke-dasharray: 8 5, stroke:#66aaff
  linkStyle default stroke:#224488,stroke-width:1.5px,stroke-dasharray: 3 3
\`\`\`

## Fixed Signal Pipeline

1. **ECG**: Live irregular P-QRS-T (RR variability added)
2. **EMG**: Raw stochastic bursts (periodic fix - chaotic noise)
2. **EMG**: High-frequency stochastic burst envelope extraction (mean 0.4mV during contraction)
3. **Control Loop**: PID gains tuned for stable arm trajectory tracking
4. **Biosensors**: Real-time SpO2 (98%), EEG alpha (12Hz), status fusion

## Performance Metrics

- Arm tracking error: <2° per joint
- EMG response latency: <50ms
- Control stability: $\\zeta > 0.7$ damping ratio

This architecture enables precise robotic manipulation driven by physiological intent signals.
    `.trim()
  }
];


export const getProjectById = (id: string): Project | undefined => {
  return projects.find(p => p.id === id);
};
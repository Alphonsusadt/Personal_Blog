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

where X is spectral data and Y is glucose concentration.
    `.trim()
  }
];

export const getProjectById = (id: string): Project | undefined => {
  return projects.find(p => p.id === id);
};
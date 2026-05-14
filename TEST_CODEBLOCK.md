# Testing CodeBlock Component

## JavaScript

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Fibonacci(10) = ${result}`);
```

## Python

```python
import numpy as np

def lowpass_filter(signal, cutoff_freq, sample_rate):
    nyquist = sample_rate / 2.0
    normalized_cutoff = cutoff_freq / nyquist
    b, a = signal.butter(4, normalized_cutoff, btype='low')
    filtered = signal.filtfilt(b, a, signal)
    return filtered

data = np.random.randn(1000)
filtered_data = lowpass_filter(data, 50, 500)
print("Filter applied successfully!")
```

## TypeScript

```typescript
interface ECGData {
  lead: string;
  samples: number[];
  sampleRate: number;
  timestamp: Date;
}

function detectRRInterval(ecg: ECGData): number[] {
  const threshold = Math.max(...ecg.samples) * 0.6;
  const peaks: number[] = [];

  for (let i = 1; i < ecg.samples.length - 1; i++) {
    if (ecg.samples[i] > threshold &&
        ecg.samples[i] > ecg.samples[i - 1] &&
        ecg.samples[i] > ecg.samples[i + 1]) {
      peaks.push(i);
    }
  }

  return peaks.slice(1).map((peak, idx) => {
    return (peak - peaks[idx]) / ecg.sampleRate * 1000;
  });
}
```

## MATLAB

```matlab
% ECG Signal Processing
fs = 360;
t = 0:1/fs:10;
ecg_signal = 1.2 * sin(2*pi*1*t) + 0.3 * randn(size(t));

[b, a] = butter(4, [0.5 40]/(fs/2), 'bandpass');
filtered_ecg = filtfilt(b, a, ecg_signal);

figure;
subplot(2,1,1);
plot(t(1:1000), ecg_signal(1:1000));
title('Raw ECG Signal');
subplot(2,1,2);
plot(t(1:1000), filtered_ecg(1:1000));
title('Filtered ECG Signal');
```

## SQL

```sql
SELECT 
    p.id,
    p.title,
    p.category,
    COUNT(t.id) AS tag_count
FROM projects p
LEFT JOIN project_tags t ON p.id = t.project_id
WHERE p.status = 'published'
GROUP BY p.id, p.title, p.category
ORDER BY p.created_at DESC
LIMIT 10;
```

## JSON

```json
{
  "project": "Biomedical Signal Analyzer",
  "version": "2.1.0",
  "features": [
    "ECG processing",
    "EMG analysis",
    "EEG visualization"
  ],
  "config": {
    "sampleRate": 500,
    "filterType": "butterworth",
    "order": 4
  }
}
```

## Bash

```bash
#!/bin/bash
echo "Setting up biomedical project..."

pip install numpy scipy matplotlib
mkdir -p data/{raw,processed,results}
python main.py --input data/raw --output data/processed

echo "Pipeline complete!"
```

## C++

```cpp
#include <iostream>
#include <vector>
#include <cmath>

std::vector<double> lowPassFilter(const std::vector<double>& signal, double alpha) {
    std::vector<double> output(signal.size());
    output[0] = signal[0];
    
    for (size_t i = 1; i < signal.size(); i++) {
        output[i] = alpha * signal[i] + (1.0 - alpha) * output[i - 1];
    }
    
    return output;
}

int main() {
    std::vector<double> ecg = {0.1, 0.5, 1.2, 0.8, 0.3, 0.1, 0.05};
    auto filtered = lowPassFilter(ecg, 0.3);
    
    for (const auto& val : filtered) {
        std::cout << val << " ";
    }
    std::cout << std::endl;
    return 0;
}
```

## Go

```go
package main

import (
    "fmt"
    "math"
)

type Signal struct {
    Samples []float64
    Rate    float64
}

func (s *Signal) RMS() float64 {
    sum := 0.0
    for _, v := range s.Samples {
        sum += v * v
    }
    return math.Sqrt(sum / float64(len(s.Samples)))
}

func main() {
    ecg := Signal{
        Samples: []float64{0.1, 0.5, 1.2, 0.8, 0.3},
        Rate:    360.0,
    }
    fmt.Printf("RMS value: %.4f\n", ecg.RMS())
}
```

# Atherforge: Multi-Key Fallback & N8N Animation Features

## Overview
This update adds two major enhancements to the Atherforge VS Code extension:
1. **Multi-Key API Fallback System** - Automatic key rotation on token exhaustion
2. **N8N-Style Pipeline Animations** - Visual flow effects during pipeline execution

---

## 1. Multi-Key API Fallback System

### Configuration
Each model now supports an array of API keys for automatic failover:

```json
{
  "atherforge.models.frontendCodeLlama.apiKeys": ["key1", "key2", "key3"],
  "atherforge.models.backendClaude.apiKeys": ["key1", "key2"],
  "atherforge.models.reasoningLlama.apiKeys": ["key1", "key2", "key3", "key4"]
}
```

### How It Works

1. **Key Rotation**: When an API call returns 401 Unauthorized:
   - Extension automatically switches to the next available key
   - Retries the request with the new key
   - Logs key rotation event to `logs/error-fixes.csv`

2. **Fallback Chain**: 
   - Tries each configured key in order
   - Up to N attempts (where N = number of configured keys)
   - Returns error only when all keys are exhausted

3. **Error Tracking**:
   - All key rotations logged in CSV format
   - Tracks context, error message, and resolution
   - Timestamps for debugging and monitoring

### Implementation Details

**Backend Logic** (src/extension.ts):
```typescript
// Key index tracking per model
const modelKeyIndices: Record<ModelKey, number> = {
  frontend: 0,
  backend: 0,
  reasoning: 0
};

// Enhanced invokeModel() with retry logic
async function invokeModel(modelKey, messages) {
  // Get apiKeys array (with backwards compatibility for apiKey)
  let apiKeys = config.get<string[]>(`${prefix}.apiKeys`) || [];
  if (apiKeys.length === 0) {
    const singleKey = config.get<string>(`${prefix}.apiKey`);
    if (singleKey) apiKeys = [singleKey];
  }
  
  // Retry loop with key rotation on 401
  for (let attempt = 0; attempt < apiKeys.length; attempt++) {
    const currentKeyIndex = modelKeyIndices[modelKey];
    // ... make API call
    // If 401: rotate to next key and continue
  }
}
```

---

## 2. N8N-Style Pipeline Animations

### Visual Effects

#### Node Pulse Animation
- Executed nodes pulse with a glowing effect
- Duration: 1.2 seconds
- Effect: Scale (1 → 1.02) + drop-shadow glow
- Color: Warm orange (#ff8f4b) with transparency fade

#### Edge Flow Animation
- Data flows along connecting edges
- Dashed lines animate continuously
- Duration: 1 second loop (linear)
- Pattern: 20px dash, 10px gap, offset animation

### How It Works

1. **Pipeline Execution**:
   - When a node starts executing, it transitions to active state
   - `node-executing` class applied (triggers pulse animation)
   - All outgoing edges get `edge-flowing` class (triggers flow animation)

2. **Animation Lifecycle**:
   - Node/edge animations last ~1.2 seconds
   - Automatically removed after execution completes
   - Next node in pipeline animates in sequence
   - Creates visual flow showing data movement between nodes

3. **Visual Feedback**:
   - Users see which node is actively processing
   - Edges show data flowing to dependent nodes
   - Smooth transitions between pipeline steps

### CSS Animations (media/atherforge.css)

```css
@keyframes edgeFlow {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -20px; }
}

@keyframes nodePulse {
  0%, 100% {
    filter: drop-shadow(0 0 0px rgba(255, 143, 75, 0.8));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 8px rgba(255, 143, 75, 1));
    transform: scale(1.02);
  }
}

.edge-flowing {
  stroke-dasharray: 20, 10;
  animation: edgeFlow 1s linear infinite;
}

.node-executing {
  animation: nodePulse 1.2s ease-in-out infinite !important;
}
```

### JavaScript Implementation (media/atherforge.js)

```javascript
if (type === 'pipelineStep') {
  const { nodeId, text } = payload;
  
  if (nodeId) {
    const node = nodes.get(nodeId);
    if (node) {
      // Add pulse animation to node
      node.classList.add('node-executing');
      
      // Animate outgoing edges
      const outgoingEdges = Array.from(
        edgeLayer.querySelectorAll(`[data-from="${nodeId}"]`)
      );
      outgoingEdges.forEach(edge => {
        edge.classList.add('edge-flowing');
      });
      
      // Remove after 1.2s
      setTimeout(() => {
        node.classList.remove('node-executing');
        outgoingEdges.forEach(edge => {
          edge.classList.remove('edge-flowing');
        });
      }, 1200);
    }
  }
}
```

---

## Files Modified

### 1. `package.json`
- Added `apiKeys` array fields for all three models
- Kept legacy `apiKey` fields (deprecated)
- Updated descriptions to document fallback behavior

### 2. `src/extension.ts`
- Added `modelKeyIndices` tracking object
- Enhanced `invokeModel()` with multi-key retry logic
- Updated `requestJson()` to include statusCode in errors
- Modified `runPipeline()` callback: `onStep(nodeId, text)`
- Updated all 6 node type handlers to pass node ID to callbacks
- Added error logging for key rotations

### 3. `media/atherforge.css`
- Added `edgeFlow` keyframe animation
- Added `nodePulse` keyframe animation
- Added `.edge-flowing` class with animation binding
- Added `.node-executing` class with animation binding

### 4. `media/atherforge.js`
- Enhanced `redrawEdges()` to add `data-from` and `data-to` attributes
- Updated `pipelineStep` handler to apply animations with nodeId
- Animation cleanup after 1.2s timeout

---

## Testing & Usage

### Multi-Key Fallback
1. Configure multiple API keys in settings:
   ```
   "atherforge.models.backendClaude.apiKeys": ["key1", "key2", "key3"]
   ```

2. Use the model - if first key is exhausted (401 error):
   - Extension automatically tries key2
   - If key2 fails, tries key3
   - Logs each rotation to `logs/error-fixes.csv`

3. Monitor key rotations in error log:
   ```
   occurredAt,fixedAt,durationMs,context,resolvedBy,errorMessage
   2024-01-15T10:30:45.123Z,2024-01-15T10:30:45.123Z,0,"backend-api","Rotated to key index 1","API key exhausted (401 Unauthorized)"
   ```

### N8N Animations
1. Create a multi-node pipeline in the pipeline editor
2. Click "Run" to execute
3. Watch as each node:
   - Pulses with a glowing effect
   - Shows animated edges flowing to connected nodes
   - Transitions smoothly to the next node

---

## Backwards Compatibility

- Old `apiKey` single-key configuration still works
- Extension automatically converts single key to array for compatibility
- No breaking changes to APIs or existing pipelines
- Gradual migration path to multi-key setup

---

## Performance Impact

- **Key Fallback**: Minimal - only triggered on 401 errors
- **Animations**: GPU-accelerated CSS animations (negligible CPU impact)
- **Memory**: Single tracking object per session (~48 bytes)

---

## Future Enhancements

Potential additions:
- Key rotation strategy configuration (random vs sequential)
- Per-model fallback settings
- Animation intensity/speed settings
- Pipeline step duration metrics
- Key expiration warnings

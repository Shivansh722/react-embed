import React, { useEffect, useState, useRef } from 'react'

function updateOutputRef(outRef, text) {
  const timestamp = new Date().toLocaleTimeString()
  outRef.current = `[${timestamp}] ${text}\n` + outRef.current
}

export default function App() {
  const [sdkVersion, setSdkVersion] = useState('9.18.0')
  const [accessToken, setAccessToken] = useState('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6ImcyOTRhcCIsImhhc2giOiIwZDhmMTNmMzljZTVkZjlkODJkZjRhOTkxMGVlYjYwZjRmMjU4ZGQ2ZGU2ZmM2OWNlOTY2ZDExYzcxODQzZTkxIiwidHJhbnNhY3Rpb25JZCI6InRyYW5zMTIzNDU2OTg3Iiwid29ya2Zsb3dJZCI6ImJhdl9mbG93IiwiaWF0IjoxNzY4ODI2ODU4LCJleHAiOjE3Njg5MTMyNTgsImp0aSI6IjFhZWY4MmFkLTc3ZTgtNDA3My05YTI2LWMwMWFkYWM5YmY1YSJ9.Eq0nR-sevi5r-MD1ZVdmPauhG-aIV99iSgPezhFbkoYz4rgwgUnFEZKBcNhVfbhWUDaarAT61HvFOPLT8ZxAHLJ_c1_Wby4Ul-XRwAfJIsueilcfn3gcjP3wRgEoIvVSbJKem3kjmY8N287-vabKBAh6r4lcAYNfyS3YMi_YtnM')
  const [workflowId, setWorkflowId] = useState('bav_flow')
  const [transactionId, setTransactionId] = useState('')
  const [showLanding, setShowLanding] = useState(true)
  const [output, setOutput] = useState('')
  const outputRef = useRef('')
  const [popupUrl, setPopupUrl] = useState(null)
  const [popupTitle, setPopupTitle] = useState('SDK Window')

  useEffect(() => {
    if (!transactionId) {
      const tx = 'demo-' + Date.now()
      setTransactionId(tx)
      updateOutputRef(outputRef, `Auto-generated transactionId: ${tx}`)
      setOutput(outputRef.current)
    }

    // Override window.open to intercept SDK popups and render them inline
    const originalWindowOpen = window.open
    window.open = function(url, target, features) {
      console.log('[window.open INTERCEPTED]', { url, target, features })
      updateOutputRef(outputRef, `🔍 window.open called with URL: ${url}`)
      setOutput(outputRef.current)
      
      if (url && typeof url === 'string') {
        console.log('[window.open] Setting popup URL:', url)
        updateOutputRef(outputRef, `✅ Intercepted popup: ${url}`)
        setOutput(outputRef.current)
        setPopupUrl(url)
        setPopupTitle(target || 'SDK Window')
        
        // Create a more realistic mock window that passes SDK checks
        const mockWindow = {
          closed: false,
          opener: window,
          parent: window,
          top: window,
          self: null, // This will be set to the mock window itself
          location: {
            href: url,
            protocol: new URL(url).protocol,
            host: new URL(url).host,
            hostname: new URL(url).hostname,
            port: new URL(url).port,
            pathname: new URL(url).pathname,
            search: new URL(url).search,
            hash: new URL(url).hash
          },
          document: {
            title: 'HyperKYC SDK',
            readyState: 'complete'
          },
          close: () => { 
            console.log('[mockWindow] close() called')
            mockWindow.closed = true
            setPopupUrl(null) 
          },
          focus: () => { console.log('[mockWindow] focus() called') },
          blur: () => { console.log('[mockWindow] blur() called') },
          postMessage: (message, targetOrigin) => { 
            console.log('[mockWindow] postMessage() called', message, targetOrigin)
            // Forward messages to parent window if needed
            window.postMessage(message, targetOrigin)
          },
          addEventListener: () => {},
          removeEventListener: () => {}
        }
        mockWindow.self = mockWindow
        
        console.log('[window.open] Returning enhanced mock window:', mockWindow)
        return mockWindow
      }
      console.log('[window.open] Falling back to original window.open')
      return originalWindowOpen.call(window, url, target, features)
    }

    // Also override top window.open if in iframe
    if (window.top !== window) {
      window.top.open = window.open
    }

    console.log('[useEffect] window.open override installed')
    updateOutputRef(outputRef, '✅ window.open override installed')
    setOutput(outputRef.current)

    return () => {
      console.log('[useEffect cleanup] Restoring original window.open')
      window.open = originalWindowOpen
    }
  }, [])

  useEffect(() => {
    // If SDK not loaded but script tag present, note it
    if (typeof window.HyperKycConfig === 'undefined' || typeof window.HyperKYCModule === 'undefined') {
      updateOutputRef(outputRef, 'Note: SDK globals not detected on initial load. If you set a different version, reload the page.')
      setOutput(outputRef.current)
    }
    
    // Check for any existing iframes that might be SDK-related
    const existingIframes = document.querySelectorAll('iframe')
    if (existingIframes.length > 0) {
      console.log('[useEffect] Found existing iframes:', existingIframes)
      existingIframes.forEach((iframe, index) => {
        if (iframe.src && iframe.src.includes('hyperverge')) {
          console.log('[useEffect] Found HyperVerge iframe:', iframe.src)
          updateOutputRef(outputRef, `🎯 Found existing SDK iframe: ${iframe.src}`)
          setOutput(outputRef.current)
          setPopupUrl(iframe.src)
          setPopupTitle('Existing SDK Iframe')
        }
      })
    }
  }, [])

  async function loadSdkByVersion(version, timeoutMs = 15000) {
    if (!version) throw new Error('No SDK version provided')
    if (typeof window.HyperKycConfig !== 'undefined' && typeof window.HyperKYCModule !== 'undefined') return
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('hv-sdk-script-dyn')
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') return resolve()
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Failed to load SDK')))
        return
      }
      const script = document.createElement('script')
      script.id = 'hv-sdk-script-dyn'
      script.src = `https://hv-web-sdk-cdn.hyperverge.co/hyperverge-web-sdk@${encodeURIComponent(version)}/src/sdk.min.js`
      script.async = true
      const timer = setTimeout(() => { script.remove(); reject(new Error('Timed out loading SDK')) }, timeoutMs)
      script.addEventListener('load', () => { clearTimeout(timer); script.setAttribute('data-loaded', 'true'); resolve() })
      script.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Failed to load SDK')) })
      document.head.appendChild(script)
    })
  }

  async function handleLaunch() {
    // secure context check
    if (!window.isSecureContext) {
      updateOutputRef(outputRef, 'Insecure context detected: please use HTTPS (ngrok or local cert).')
      setOutput(outputRef.current)
      return
    }

    // Generate a fresh transactionId for every launch to avoid reusing demo token IDs
    const newTx = 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    setTransactionId(newTx)
    updateOutputRef(outputRef, `Generated transactionId for this launch: ${newTx}`)
    setOutput(outputRef.current)

    if (!accessToken || !workflowId) {
      updateOutputRef(outputRef, 'Please provide accessToken and workflowId.')
      setOutput(outputRef.current)
      return
    }

    // Ensure SDK loaded
    if (typeof window.HyperKycConfig === 'undefined' || typeof window.HyperKYCModule === 'undefined') {
      try {
        updateOutputRef(outputRef, `Loading SDK @${sdkVersion}...`)
        setOutput(outputRef.current)
        await loadSdkByVersion(sdkVersion)
        updateOutputRef(outputRef, 'SDK loaded dynamically.')
        setOutput(outputRef.current)
      } catch (err) {
        updateOutputRef(outputRef, 'Failed to load SDK: ' + err.message)
        setOutput(outputRef.current)
        return
      }
    }

    let config
    try {
      // Try with options object including iframe mode
      const options = {
        showLanding: !!showLanding,
        mode: 'iframe'
      }
      console.log('[handleLaunch] Creating HyperKycConfig with options:', {
        accessToken: accessToken.substring(0, 20) + '...',
        workflowId,
        transactionId: newTx,
        options
      })
      // Pass the freshly generated transaction id into the SDK call
      config = new window.HyperKycConfig(accessToken, workflowId, newTx, false)
      config.setInputs({
        "name": "shivansh"
      })
      console.log('[handleLaunch] HyperKycConfig created with options and inputs:', config)
    } catch (err) {
      updateOutputRef(outputRef, 'Failed to create HyperKycConfig with options: ' + err.message + ' — trying fallback.')
      setOutput(outputRef.current)
      console.error('[handleLaunch] Config creation error with options:', err)
      try {
        // Fallback to original (use generated tx)
        config = new window.HyperKycConfig(accessToken, workflowId, newTx, !!showLanding)
        config.setInputs({
          "name": "shivansh"
        })
        console.log('[handleLaunch] HyperKycConfig created fallback with inputs:', config)
      } catch (err2) {
        updateOutputRef(outputRef, 'Failed to create HyperKycConfig fallback: ' + err2.message)
        setOutput(outputRef.current)
        console.error('[handleLaunch] Config creation error fallback:', err2)
        return
      }
    }

    const handler = (HyperKycResult) => {
      // Prefer the SDK-returned metadata.transactionId, but fall back to our generated id
      const returnedTx = (HyperKycResult && HyperKycResult.metadata && HyperKycResult.metadata.transactionId) || newTx
      const short = `status=${HyperKycResult.status} code=${HyperKycResult.code} message=${HyperKycResult.message} transactionId=${returnedTx}`
      console.log('[SDK Handler] Result received:', HyperKycResult)
      updateOutputRef(outputRef, 'Handler invoked — ' + short)
      setOutput(outputRef.current)
    }

    updateOutputRef(outputRef, 'Launching HyperKYC SDK...')
    setOutput(outputRef.current)
    console.log('[handleLaunch] Calling HyperKYCModule.launch...')
    
    // Monitor for iframe creation AND modal overlays after launch
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'IFRAME') {
            console.log('[SDK] Iframe created:', node.src, node)
            updateOutputRef(outputRef, `📺 SDK created iframe: ${node.src}`)
            setOutput(outputRef.current)
            if (node.src && !popupUrl) {
              setPopupUrl(node.src)
              setPopupTitle('SDK Iframe')
            }
          }
          // Detect SDK modal overlays (high z-index containers)
          if (node.nodeType === 1) { // Element node
            const computedStyle = window.getComputedStyle(node)
            const zIndex = parseInt(computedStyle.zIndex)
            const position = computedStyle.position
            
            // Check if this is a modal overlay (high z-index, fixed/absolute position)
            if (zIndex > 1000 && (position === 'fixed' || position === 'absolute')) {
              console.log('[SDK] Modal overlay detected:', node, 'z-index:', zIndex)
              updateOutputRef(outputRef, `🎯 SDK modal overlay detected (z-index: ${zIndex})`)
              setOutput(outputRef.current)
              
              // Look for iframe inside the modal
              const iframe = node.querySelector('iframe')
              if (iframe && iframe.src) {
                console.log('[SDK] Found iframe inside modal:', iframe.src)
                updateOutputRef(outputRef, `📺 Extracted iframe from modal: ${iframe.src}`)
                setOutput(outputRef.current)
                setPopupUrl(iframe.src)
                setPopupTitle('SDK Iframe (from modal)')
                
                // Hide the modal overlay since we're displaying the iframe in our panel
                node.style.display = 'none'
              }
            }
          }
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
    
    try {
      const res = await window.HyperKYCModule.launch(config, handler)
      console.log('[handleLaunch] Launch returned:', res)
      updateOutputRef(outputRef, 'Launch call completed.')
      setOutput(outputRef.current)
      
      // Disconnect observer after a delay
      setTimeout(() => observer.disconnect(), 5000)
    } catch (err) {
      console.error('[handleLaunch] Launch error:', err)
      updateOutputRef(outputRef, 'HyperKYCModule.launch threw: ' + (err && err.message ? err.message : String(err)))
      setOutput(outputRef.current)
      observer.disconnect()
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Roboto, "Segoe UI", Arial', display: 'flex', gap: 24 }}>
      {/* Left side: Form and controls */}
      <div style={{ flex: '0 0 500px' }}>
        <h1>HyperKYC Web SDK — Quick Launcher (React)</h1>
        <p>Paste your short-lived <code>accessToken</code>, <code>workflowId</code> and a <code>transactionId</code> to test launching the SDK locally.</p>

        <label>SDK Version
          <input value={sdkVersion} onChange={e => setSdkVersion(e.target.value)} style={{ display: 'block', width: '100%', maxWidth: 520, padding: 8 }} />
        </label>

        <label>Access token
          <input value={accessToken} onChange={e => setAccessToken(e.target.value)} style={{ display: 'block', width: '100%', maxWidth: 520, padding: 8 }} />
        </label>

        <label>Workflow ID
          <input value={workflowId} onChange={e => setWorkflowId(e.target.value)} style={{ display: 'block', width: '100%', maxWidth: 520, padding: 8 }} />
        </label>

        <label>Transaction ID
          <input value={transactionId} onChange={e => setTransactionId(e.target.value)} style={{ display: 'block', width: '100%', maxWidth: 520, padding: 8 }} />
        </label>

        <label style={{ display: 'block', marginTop: 8 }}><input type="checkbox" checked={showLanding} onChange={e => setShowLanding(e.target.checked)} /> Show landing page</label>

        <button onClick={handleLaunch} style={{ marginTop: 16, padding: '10px 16px' }}>Launch HyperKYC</button>

        <div style={{ marginTop: 16, whiteSpace: 'pre-wrap', background: '#f6f8fa', padding: 12, borderRadius: 6, maxWidth: 820 }}>{output}</div>
      </div>

      {/* Right side: SDK embedded view */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {popupUrl ? (
          <div style={{
            height: 'calc(100vh - 48px)',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Title bar with close button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#f5f5f5'
            }}>
              <div style={{ flex: 1, fontWeight: 'bold', fontSize: 16 }}>{popupTitle}</div>
              <button
                onClick={() => setPopupUrl(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: '0 8px'
                }}
              >×</button>
            </div>
            {/* Iframe for SDK content */}
            <iframe
              src={popupUrl}
              style={{
                flex: 1,
                border: 'none',
                width: '100%',
                height: '100%'
              }}
              allow="camera; microphone; geolocation"
              title="HyperKYC SDK"
            />
          </div>
        ) : (
          <div style={{
            height: 'calc(100vh - 48px)',
            border: '2px dashed #e0e0e0',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 18
          }}>
            SDK will appear here after launch
          </div>
        )}
      </div>
    </div>
  )
}

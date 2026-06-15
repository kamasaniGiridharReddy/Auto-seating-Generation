import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ERROR BOUNDARY] Component Error:', error)
    console.error('[ERROR BOUNDARY] Error Info:', errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--grit-brown-900)]">
          <div className="max-w-2xl w-full mx-4 rounded-xl border border-red-500/40 bg-red-500/10 p-6">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Component Error</h1>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-[var(--grit-cream)]/70 mb-1">Error Message:</p>
                <p className="text-sm text-red-300 font-mono bg-black/20 p-3 rounded">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>
              {this.state.error?.stack && (
                <div>
                  <p className="text-sm font-semibold text-[var(--grit-cream)]/70 mb-1">Stack Trace:</p>
                  <pre className="text-xs text-red-300/80 font-mono bg-black/20 p-3 rounded overflow-auto max-h-64">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              {this.state.errorInfo && (
                <div>
                  <p className="text-sm font-semibold text-[var(--grit-cream)]/70 mb-1">Component Stack:</p>
                  <pre className="text-xs text-red-300/80 font-mono bg-black/20 p-3 rounded overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

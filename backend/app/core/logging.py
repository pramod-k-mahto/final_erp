import logging
import sys
import uuid
from contextvars import ContextVar
from fastapi import Request

# Context variable to store trace ID for the current request
trace_id_ctx: ContextVar[str] = ContextVar("trace_id", default="-")

class TraceIDFilter(logging.Filter):
    """
    Injects the trace_id from the context variable into log records.
    """
    def filter(self, record):
        record.trace_id = trace_id_ctx.get()
        return True

def setup_logging():
    """
    Configures structured enterprise logging.
    """
    logger = logging.getLogger("erp")
    logger.setLevel(logging.INFO)
    
    # Check if handlers are already configured to avoid duplicate logs
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        
        # Define the enterprise log format
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | [Trace: %(trace_id)s] | %(name)s:%(lineno)d | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        handler.addFilter(TraceIDFilter())
        
        logger.addHandler(handler)
    
    return logger

log = setup_logging()

async def trace_id_middleware(request: Request, call_next):
    """
    FastAPI Middleware to generate and attach a Trace ID to every request.
    This enables full request lifecycle tracking across logs.
    """
    # Use provided X-Trace-Id if available (for microservice chains), otherwise generate
    trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4())[:8])
    
    # Set the context variable
    token = trace_id_ctx.set(trace_id)
    
    # Attach to request state for use in routes
    request.state.trace_id = trace_id
    
    try:
        log.info(f"Incoming {request.method} {request.url.path}")
        response = await call_next(request)
        response.headers["X-Trace-Id"] = trace_id
        return response
    finally:
        # Reset context variable
        trace_id_ctx.reset(token)

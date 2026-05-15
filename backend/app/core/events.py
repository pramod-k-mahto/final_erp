import asyncio
from typing import Callable, Any, Dict, List
import logging

logger = logging.getLogger(__name__)

class EventDispatcher:
    """
    A simple async Pub/Sub event dispatcher for Domain-Driven Design.
    Allows modules to communicate without tight coupling.
    """
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}

    def subscribe(self, event_name: str, callback: Callable):
        if event_name not in self._listeners:
            self._listeners[event_name] = []
        self._listeners[event_name].append(callback)
        logger.debug(f"Subscribed {callback.__name__} to event '{event_name}'")

    async def publish(self, event_name: str, payload: Any):
        if event_name not in self._listeners:
            return
            
        callbacks = self._listeners[event_name]
        logger.info(f"Publishing event '{event_name}' to {len(callbacks)} listeners.")
        
        # Fire-and-forget all callbacks using asyncio.create_task
        for callback in callbacks:
            try:
                # Assuming callbacks are async
                asyncio.create_task(self._safe_execute(callback, payload, event_name))
            except Exception as e:
                logger.error(f"Failed to schedule event listener {callback.__name__}: {e}")

    async def _safe_execute(self, callback: Callable, payload: Any, event_name: str):
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(payload)
            else:
                # If sync callback, run it (though async is preferred)
                callback(payload)
        except Exception as e:
            logger.exception(f"Error in listener {callback.__name__} for event '{event_name}': {e}")

# Global instance
dispatcher = EventDispatcher()

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.core.security import SECRET_KEY, ALGORITHM
from app.modules.auth.repositories.user_repo import UserRepository
from app.modules.auth.services.auth_service import AuthService
from app.modules.auth.schemas.token import TokenPayload

# This specifies where the frontend should send login requests
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)

def get_auth_service(
    db: Session = Depends(get_db),
    repo: UserRepository = Depends(get_user_repository)
) -> AuthService:
    return AuthService(repository=repo, db=db)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> dict: # Returning a dict to map to our RBAC engine seamlessly
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(**payload)
    except JWTError:
        raise credentials_exception
        
    repo = UserRepository(db)
    user = repo.get_by_id(int(token_data.sub))
    if user is None or not user.is_active:
        raise credentials_exception
        
    # Return as dict to integrate with core.permissions
    return {
        "id": user.id,
        "role": user.role.value,
        "tenant_id": user.tenant_id,
        "permissions": user.tenant_permissions or []
    }

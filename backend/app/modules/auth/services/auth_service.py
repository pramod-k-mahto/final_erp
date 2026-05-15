from sqlalchemy.orm import Session
from app.modules.auth.repositories.user_repo import UserRepository
from app.modules.auth.schemas.user import UserLogin, UserCreate, UserResponse
from app.modules.auth.schemas.token import Token
from app.modules.auth.exceptions import InvalidCredentialsException, EmailAlreadyExistsException
from app.core.security import verify_password, create_access_token

class AuthService:
    def __init__(self, repository: UserRepository, db: Session):
        self.repo = repository
        self.db = db

    def authenticate(self, credentials: UserLogin) -> Token:
        user = self.repo.get_by_email(credentials.email)
        if not user or not user.is_active:
            raise InvalidCredentialsException()
            
        if not verify_password(credentials.password, user.password_hash):
            raise InvalidCredentialsException()
            
        access_token = create_access_token(
            subject=user.id,
            role=user.role.value
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            role=user.role.value
        )

    def register_user(self, user_in: UserCreate) -> UserResponse:
        existing = self.repo.get_by_email(user_in.email)
        if existing:
            raise EmailAlreadyExistsException()
            
        try:
            user = self.repo.create(user_in)
            self.db.commit()
            self.db.refresh(user)
            return UserResponse.model_validate(user)
        except Exception:
            self.db.rollback()
            raise

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.modules.auth.schemas.token import Token
from app.modules.auth.schemas.user import UserCreate, UserResponse, UserLogin
from app.modules.auth.services.auth_service import AuthService
from app.modules.auth.dependencies import get_auth_service, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_service)
):
    """
    OAuth2 compatible token login, getting username and password from form data.
    """
    credentials = UserLogin(email=form_data.username, password=form_data.password)
    return service.authenticate(credentials)

@router.post("/register", response_model=UserResponse)
def register(
    user_in: UserCreate,
    service: AuthService = Depends(get_auth_service)
):
    return service.register_user(user_in)

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

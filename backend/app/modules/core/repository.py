from sqlalchemy.orm import Session
from typing import Generic, TypeVar, Type, Optional, List
from pydantic import BaseModel
from ...core.database import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db: Session):
        self.model = model
        self.db = db

    def get(self, id: int) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_by_company(self, id: int, company_id: int) -> Optional[ModelType]:
        return self.db.query(self.model).filter(
            self.model.id == id,
            self.model.company_id == company_id
        ).first()

    def get_all_for_company(self, company_id: int, skip: int = 0, limit: int = 100) -> List[ModelType]:
        return self.db.query(self.model).filter(
            self.model.company_id == company_id
        ).offset(skip).limit(limit).all()

    def create(self, obj_in: CreateSchemaType, company_id: Optional[int] = None) -> ModelType:
        obj_data = obj_in.model_dump()
        if company_id is not None:
            obj_data["company_id"] = company_id
            
        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def update(self, db_obj: ModelType, obj_in: UpdateSchemaType) -> ModelType:
        obj_data = obj_in.model_dump(exclude_unset=True)
        for field, value in obj_data.items():
            setattr(db_obj, field, value)
        self.db.add(db_obj)
        self.db.flush()
        return db_obj

    def delete(self, id: int) -> bool:
        obj = self.get(id)
        if obj:
            self.db.delete(obj)
            self.db.flush()
            return True
        return False

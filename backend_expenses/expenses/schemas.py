from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional

class ExpenseSchema(BaseModel):
    value: float = Field(..., gt=0, description="Valor da despesa (maior que zero)")
    category: str = Field(..., max_length=50)
    date: date
    description: Optional[str] = None

    @field_validator('date')
    def date_not_in_future(cls, v):
        if v > date.today():
            raise ValueError('A data não pode ser futura')
        return v

    @field_validator('category')
    def category_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Categoria não pode ser vazia')
        return v

    @field_validator('description')
    def description_length(cls, v):
        if v and len(v) > 500:
            raise ValueError('Descrição não pode ter mais que 500 caracteres')
        return v

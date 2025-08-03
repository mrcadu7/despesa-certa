from datetime import date as Date
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

CATEGORY_CHOICES = [
    "moradia",
    "alimentacao",
    "transporte",
    "saude",
    "educacao",
    "lazer",
    "vestuario",
    "servicos",
    "dividas",
    "investimentos",
    "outros",
]

CategoryType = Literal[
    "moradia",
    "alimentacao",
    "transporte",
    "saude",
    "educacao",
    "lazer",
    "vestuario",
    "servicos",
    "dividas",
    "investimentos",
    "outros",
]


class ExpenseSchema(BaseModel):
    value: Decimal = Field(
        ..., gt=0, decimal_places=2, description="Valor da despesa (maior que zero)"
    )
    category: CategoryType = Field(..., description="Categoria da despesa")
    date: Date = Field(..., description="Data da despesa")
    description: Optional[str] = Field(None, max_length=500, description="Descrição opcional")

    @field_validator("value")
    def value_reasonable(cls, v):
        if v > Decimal("1000000"):
            raise ValueError("Valor muito alto - verifique se está correto")
        return v

    @field_validator("description")
    def description_clean(cls, v):
        if v:
            v = v.strip()
            if not v:
                return None
        return v


class ExpensePartialSchema(BaseModel):
    value: Optional[Decimal] = Field(
        None, gt=0, decimal_places=2, description="Valor da despesa (maior que zero)"
    )
    category: Optional[CategoryType] = Field(None, description="Categoria da despesa")
    date: Optional[Date] = Field(None, description="Data da despesa")
    description: Optional[str] = Field(None, max_length=500, description="Descrição opcional")

    @field_validator("value")
    def value_reasonable(cls, v):
        if v and v > Decimal("1000000"):
            raise ValueError("Valor muito alto - verifique se está correto")
        return v

    @field_validator("description")
    def description_clean(cls, v):
        if v:
            v = v.strip()
            if not v:
                return None
        return v


class MonthlyIncomeSchema(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="Valor da renda mensal")
    date: Date = Field(..., description="Data real da renda")

    @field_validator("amount")
    def amount_reasonable(cls, v):
        if v > Decimal("10000000"):  # 10 milhões
            raise ValueError("Valor muito alto - verifique se está correto")
        if v < Decimal("0.01"):
            raise ValueError("Valor deve ser maior que zero")
        return v


class MonthlyIncomePartialSchema(BaseModel):
    amount: Optional[Decimal] = Field(
        None, gt=0, decimal_places=2, description="Valor da renda mensal"
    )
    date: Optional[Date] = Field(None, description="Data real da renda")

    @field_validator("amount")
    def amount_reasonable(cls, v):
        if v is not None:
            if v > Decimal("10000000"):  # 10 milhões
                raise ValueError("Valor muito alto - verifique se está correto")
            if v < Decimal("0.01"):
                raise ValueError("Valor deve ser maior que zero")
        return v


class FinancialAnalysisSchema(BaseModel):
    income: Decimal = Field(..., ge=0, decimal_places=2)
    total_expenses: Decimal = Field(..., ge=0, decimal_places=2)
    balance: Decimal = Field(..., decimal_places=2)
    expense_ratio: Decimal = Field(
        ..., ge=0, decimal_places=4, description="Percentual de gastos em relação à renda"
    )

    @field_validator("expense_ratio")
    def expense_ratio_percentage(cls, v):
        if v > Decimal("10"):  # 1000%
            raise ValueError("Percentual de gastos muito alto")
        return v

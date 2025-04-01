/// <reference types="cypress" />

import { it } from "node:test";

it('should display subcategories', () => {
    cy.get('[data-testid="subcategory-list"]').should('be.visible');
    cy.get('[data-testid="subcategory-item"]').should('have.length.greaterThan', 0);
  });
  
it('should allow adding new tasks', () => {
    cy.get('[data-testid="add-task-button"]').click();
    cy.get('[data-testid="task-form"]').should('be.visible');
  });
  
it('should complete tasks', () => {
    cy.get('[data-testid="complete-task-button"]').first().click();
    cy.get('[data-testid="task-item"]').first().should('have.class', 'completed');
  });
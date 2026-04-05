import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormComponent } from './form';
import { LocalStorageService } from '../../services/local-storage.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-simple-indicator',
  template: '',
  standalone: true
})
class MockSimpleIndicator {
  type = input<string>(); 
}

describe('FormComponent', () => {
  let component: FormComponent;
  let fixture: ComponentFixture<FormComponent>;
  let localStorageService: jasmine.SpyObj<LocalStorageService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRouteMock: any;

  beforeEach(async () => {
    const localStorageSpy = jasmine.createSpyObj('LocalStorageService', [
      'getFromLocalStorage',
      'saveToLocalStorage',
      'clearLocalStorage',
    ]);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    
    activatedRouteMock = {
      queryParamMap: of(new Map()),
      snapshot: { queryParams: {} }
    };

    await TestBed.configureTestingModule({
      // Import the component under test AND the mock for its child
      imports: [FormComponent, NoopAnimationsModule, MockSimpleIndicator],
      providers: [
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    localStorageService = TestBed.inject(LocalStorageService) as jasmine.SpyObj<LocalStorageService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(FormComponent);
    component = fixture.componentInstance;

    // Initialize required signal inputs before first detectChanges
    fixture.componentRef.setInput('isLoading', false);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize form from local storage data', () => {
      const localData = {
        projectName: 'TestProject',
        apiToken: 'token123',
        email: 'test@example.com',
      };
      localStorageService.getFromLocalStorage.and.returnValue(localData);

      fixture.detectChanges();

      expect(component['projectName']()).toBe('TestProject');
      expect(component['apiToken']()).toBe('token123');
      expect(component['email']()).toBe('test@example.com');
      expect(component['rememberToken']()).toBe(true);
    });

    it('should initialize form with empty values when no local storage data', () => {
      localStorageService.getFromLocalStorage.and.returnValue(undefined);

      fixture.detectChanges();

      expect(component['projectName']()).toBe('');
      expect(component['apiToken']()).toBe('');
      expect(component['email']()).toBe('');
      expect(component['rememberToken']()).toBe(false);
    });

    it('should create FormGroup with correct structure', () => {
      fixture.detectChanges();

      expect(component.myForm).toBeDefined();
      expect(component.myForm.get('projectName')).toBeDefined();
    });
  });

  describe('formErrors', () => {
    it('should return error when required fields are empty', () => {
      fixture.detectChanges();
      const errors = component['formErrors']();
      expect(errors).toContain('All fields are required.');
    });

    it('should not return error when all fields are filled', () => {
      fixture.detectChanges();
      component['projectName'].set('TestProject');
      component['apiToken'].set('token123');
      component['email'].set('test@example.com');
      component['teams'].set(['Team1']);
      component['sprints'].set('Sprint1');

      const errors = component['formErrors']();
      expect(errors.length).toBe(0);
    });
  });

  describe('onSubmit', () => {
    it('should emit formSubmit with current form value', () => {
      fixture.detectChanges();
      component['projectName'].set('TestProject');
      component['apiToken'].set('token123');
      component['email'].set('test@example.com');
      component['teams'].set(['Team1']);
      component['sprints'].set('Sprint1');

      const emitSpy = spyOn(component.formSubmit, 'emit');
      component.onSubmit();

      const emittedValue = emitSpy.calls.mostRecent()?.args[0];
      expect(emittedValue?.projectName).toBe('TestProject');
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from observables', () => {
      fixture.detectChanges();
      const nextSpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
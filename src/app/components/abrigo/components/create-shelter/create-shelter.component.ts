import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ShelterService } from '../../../../core/services/shelter.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CapitalPipe } from '../../../../core/pipes/capital.pipe';
import { RSCitiesDto } from '../../../../shared/dtos/cities.dto';
import { OperatorFunction, Observable, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-create-shelter',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CapitalPipe,
    NgbTypeaheadModule,
    FormsModule
  ],
  templateUrl: './create-shelter.component.html',
  styleUrl: './create-shelter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateShelterComponent {
  needs = ['Água','Ração', 'Remédios', 'Roupinhas', 'Coleiras', 'Itens de higiene', 'Fraldas','Colchonetes','Ajuda financeira','Tapete Higiênico','Sachê para cachorro', 'Sachê para gato','veterinário local', 'veterinário online','voluntário']
  selectedNeeds = signal<string[]>([])
  #fb = inject(FormBuilder)
  #router = inject(Router)
  #shelterService = inject(ShelterService)
  form = this.#fb.nonNullable.group({
    location: ['', Validators.required],
    address: ['Entre em contato', Validators.required],
    name: ['Não informado', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['0', Validators.required],
    capacity: [0, [Validators.required, Validators.min(1)]],
    occupation: [0, [Validators.required, Validators.min(0)]],
    owner: ['Não informado', Validators.required],
    needs: [['']],
    other_needs: ['']
  });
  cities = RSCitiesDto
  model:any
  toastService = inject(ToastService)

  @ViewChild('successTpl') successTpl!: TemplateRef<any>;
  @ViewChild('errorTpl') errorTpl!: TemplateRef<any>;
  @ViewChild('capacityTpl') capacityTpl!: TemplateRef<any>;
  @ViewChild('cityTpl') city!: TemplateRef<any>;

  private static removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  search: OperatorFunction<string, readonly string[]> = (
    text$: Observable<string>
  ) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map((term) => {
        const sanitizedTerm = CreateShelterComponent.removeAccents(term).toLowerCase();
        return sanitizedTerm.length < 2
          ? []
          : this.cities
              .filter((v) => CreateShelterComponent.removeAccents(v).toLowerCase().indexOf(sanitizedTerm) > -1)
              .slice(0, 10)
      })
    );
  updateList(item: string){
    console.log(item)
    if(this.selectedNeeds().includes(item)){
      const newList = this.selectedNeeds().filter(need => need !== item)
      this.selectedNeeds.set(newList)
      this.form.controls.needs.setValue(newList)
    }else{
      this.selectedNeeds.update(need => [...need, item])
      this.form.controls.needs.setValue([...this.selectedNeeds()])
    }
  }

  register(){
    if(!this.cities.includes(this.form.controls.location.value)){
      this.toastService.show({ template: this.city, classname: "text-white bg-danger p-2" });
      return
    }
        //check if occupation is bigger than capacity
        if (this.form.controls.occupation.value > this.form.controls.capacity.value) {
          this.toastService.show({ template: this.capacityTpl, classname: "text-white bg-danger p-2" });
          return;
        }
    if(!this.form.controls.address.value) this.form.controls.address.setValue('Entre em contato')
      return confirm('Deseja realmente cadastrar esse abrigo?') &&
      this.#shelterService.createShelter(this.form.getRawValue()).subscribe({
        next:()=>{
          this.toastService.show({ template: this.successTpl, classname:"text-white bg-success p-2" });
          this.#router.navigateByUrl('/abrigos')
        },error:()=>{
          this.toastService.show({ template: this.errorTpl, classname:"text-white bg-danger p-2" });
        }
      })

  }

}

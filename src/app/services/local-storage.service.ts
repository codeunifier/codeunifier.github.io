import { Injectable } from "@angular/core";
import { LocalData } from "../models/local-data.model";

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  key: string = 'localData';
  
  getFromLocalStorage(): LocalData | undefined {
    const strData = localStorage.getItem(this.key);

    if (strData) {
      return JSON.parse(atob(strData)) as LocalData;
    }

    return undefined;
  }

  saveToLocalStorage(data: LocalData): void {
    localStorage.setItem(this.key, btoa(JSON.stringify(data)));
  }

  clearLocalStorage(): void {
    localStorage.removeItem(this.key);
  }
}

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieDetailsComponent } from './movie-details/movie-details.component';
import { MovieFeedComponent } from './movie-feed/movie-feed.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UserSubscriptionsComponent } from './user-subscriptions/user-subscriptions.component';



@NgModule({
  declarations: [
    MovieDetailsComponent,
    MovieFeedComponent,
    UserSubscriptionsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule
  ],
  exports: [
    MovieDetailsComponent,
    MovieFeedComponent,
  ]
})
export class MovieModule { }

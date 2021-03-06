import {NavController, NavParams, AlertController, ActionSheetController, Events, ActionSheet} from 'ionic-angular'
import {Component, ElementRef} from '@angular/core'
import {Validators, FormBuilder} from '@angular/common'
import {PostService} from '../../services/api/ApiService'
import {AppConstants} from '../../AppConstants'
import {NavigationService} from '../../services/navigation/NavigationService'
import {Environment} from '../../Environment'

declare const heap: any

@Component({
  templateUrl: 'build/pages/PostDetailPage/PostDetailPage.html',
})

export class PostDetailPage {

  private postID: string
  public post: any
  private commentsCount: number
  private isCommentMode: boolean
  private swipingComment: boolean
  private createCommentForm

  isFormValid: boolean
  isMyPost: boolean
  postActions: ActionSheet
  reportActions: ActionSheet

  constructor(private nav: NavController,
              private postService: PostService,
              private params: NavParams,
              private form: FormBuilder,
              private alertCtrl: AlertController,
              private myElement: ElementRef,
              private actionSheetCtrl: ActionSheetController,
              private events: Events) {
    this.postID = params.get('postID')
    this.swipingComment = false
    this.createCommentForm = form.group({
      content: ['', Validators.required]
    })
    this.isFormValid = false

    this.resetForm()
    this.fetch()

  }

  goToProfile(event, userID) {
    NavigationService.goToProfile(this.nav, event, userID)
  }

  createComment() {
    this.postService
      .createComment(this.postID, { content: this.createCommentForm.value.content })
      .subscribe(this.createCommentSuccess, this.createCommentFailure)
  }

  openCommentOptions(ev, commentID, authorID) {
    if (this.swipingComment === false) {

      //check if reporting own comment
      let currentUserID = localStorage.getItem('USER_ID')
      if (authorID === currentUserID) {
        // TODO: insert delete comment option here
        return
      }

      this.swipingComment = true
      this.reportComment(ev, commentID)
    }
  }

  createCommentSuccess = () => {
    this.fetch()
    this.resetForm()
    this.events.publish('feedback:show', { msg: 'Nice one!', icon: 'checkmark' })
    this.events.publish('notifications:activate')
  }

  createCommentFailure = () => {
    let failAlert = this.alertCtrl.create({
      title: 'Ups!',
      subTitle: 'There was an error on our side, sorry about that.',
      buttons: ['OK']
    })
    failAlert.present()
  }

  resetForm(): void {
    this.createCommentForm.controls['content'].updateValue('')
  }

  formatTimeRequired(seconds) {
    let options = AppConstants.REQUIRED_TIME_OPTIONS

    if (seconds > 0) {
      for (let i in options.values) {
        let val = options.values[i]
        if (val.optionValue === seconds) {
          if (this.post && (this.post.postType === AppConstants.OFFER)) {
            return `Offering ${val.text.toLowerCase()}`
          }
          return `Would like ${val.text.toLowerCase()}`
        }
      }
    }

    return 'To be determined'
  }

  commentMode(ev, mode: boolean) {
    this.isFormValid = this.createCommentForm.valid
    this.isCommentMode = mode || this.createCommentForm.valid
  }

  privateButtons: Array<any> = [{
    text: 'Delete',
    role: 'destructive',
    handler: () => {
      this.postService.deletePost(this.post.postID).subscribe(() => {
        this.events.publish('feedback:show', { msg: 'Deleted!', icon: 'checkmark' })
        this.events.publish('user:posts:updated', this.post)
        this.nav.pop()
      })
    }
  }, {
    text: 'Cancel',
    role: 'cancel',
  }]

  publicButtons: Array<any> = [{
    text: 'Report',
    role: 'destructive',
    handler: () => {
      this.postService.reportPost(this.post.postID).subscribe((result) => {
        let msg = result.json().msg
        this.events.publish('feedback:show', { msg, icon: 'checkmark' })
        this.nav.pop()
      })
    }
  }, {
    text: 'Cancel',
    role: 'cancel',
  }]

  reportCommentButtons(commentID) {
    return [{
      text: 'Report',
      role: 'destructive',
      handler: () => {
        this.postService.reportComment(commentID).subscribe(() => {
          let msg = 'Thank you! We will review the comment shortly.'
          this.swipingComment = false
          this.events.publish('feedback:show', { msg, icon: 'checkmark' })
        })
      }
    }, {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        this.swipingComment = false
      }
    }]
  }

  openOptions(event) {
    event.stopPropagation()
    this.postActions = this.actionSheetCtrl.create({
      title: 'Post actions',
      buttons: this.isMyPost ? this.privateButtons : this.publicButtons
    })

    this.postActions.present()
  }

  reportComment(event, commentID: string) {
    this.reportActions = this.actionSheetCtrl.create({
      title: 'Comment Options',
      buttons: this.reportCommentButtons(commentID)
    })
    this.reportActions.present()
  }

  private onLoadError() {
    this.nav.pop().then(() => {
      let loadErrorAlert = this.alertCtrl.create({
        title: 'Could not load post, try again later!',
        subTitle: '',
        buttons: ['OK']
      })
      loadErrorAlert.present()
    })
  }

  fetch() {
    this.postService.getPost(
      this.postID,
      response => {
        this.post = response.json()
        this.commentsCount = this.post.comments.length
        let currentUserID = localStorage.getItem('USER_ID')
        if (Environment.HEAP && 'heap' in window) {
          heap.track('POST_VIEW', { postID: this.post.postID })
        }
        this.isMyPost = (currentUserID === this.post.author.userID)
      }, () => setTimeout(() => this.onLoadError(), 999)
    )
  }
}

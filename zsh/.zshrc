autoload -Uz compinit
compinit
eval "$(starship init zsh)"

source <(kubectl completion zsh)
source "$(brew --prefix)/share/google-cloud-sdk/path.zsh.inc"
source "$(brew --prefix)/share/google-cloud-sdk/completion.zsh.inc"
source ~/.config/envman/load.sh
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

alias ffprobe='~/Desktop/dev/ffmpeg/ffprobe'

# pnpm
export PNPM_HOME="/Users/shibujoe/Library/pnpm"
export PATH="$PNPM_HOME:$PATH"
# pnpm end
export GPG_TTY=\$(tty)

# bun completions
[ -s "/Users/shibujoe/.bun/_bun" ] && source "/Users/shibujoe/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

fpath=($fpath ~/.zsh/completion)

# The next line updates PATH for the Google Cloud SDK.
if [ -f '/Users/shibujoe/Downloads/google-cloud-sdk/path.zsh.inc' ]; then . '/Users/shibujoe/Downloads/google-cloud-sdk/path.zsh.inc'; fi

# The next line enables shell command completion for gcloud.
if [ -f '/Users/shibujoe/Downloads/google-cloud-sdk/completion.zsh.inc' ]; then . '/Users/shibujoe/Downloads/google-cloud-sdk/completion.zsh.inc'; fi

# Generated for envman. Do not edit.
[ -s "$HOME/.config/envman/load.sh" ] && source "$HOME/.config/envman/load.sh"

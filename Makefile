.PHONY: setup start stop test e2e health
setup start stop test e2e health:
	cd src && ./scripts/$@.sh
